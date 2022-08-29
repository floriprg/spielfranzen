<?php
function tosql()
{
    function del($spieler, $spielername, $dran)
    {
        $todel = $_POST['to_del'];
        $todel = substr($todel, -10);
        $s = $_POST['s'];
        $usercards = sql("select " . $spielername . "->>'karten' as karten, ablegkarten, trumpf from spiele where id = " . $s);
        while ($row = pg_fetch_row($usercards)) {

            $user = $row[0];
            $farbe = explode(",", trim($row[1], '{}'));
            $trumpf = $row[2];
        }
        echo "alert $user, " . substr($farbe[0], -8, 4) . ",";
        //wenn spieler weder farbe noch trumpf hat    |||||||||||||||||||||||||||||||||||||||||||||||||| wenn er farbe zugegeben hat||||||||||||||||||||||||||||||wenn er farbe nicht hat und trumpf zugibt
        if (((strpos($user, substr($farbe[0], -8, 4)) == false) && (strpos($user, $trumpf) == false)) || (strpos($todel, substr($farbe[0], -8, -4)) !== false) || ((strpos($todel, $trumpf) !== false) && (strpos($user, substr($farbe[0], -8, 4)) == false))) {
            $spieler->karten = array_values(array_diff($spieler->karten, [$todel]));
            sql("update spiele set ablegkarten = ablegkarten || '{" . $todel . "}', " . $spielername . "= '" . json_encode($spieler) . "', jetztdran= '" . $dran . "' where id = " . $s);
        }
        else {
            echo "Du musst Trumpf oder Farbe zugeben!";
        }

    }
    require "config.php";
    $type = $_POST['type'];
    if ($type == "ins") {
        $sql = $_POST['sql'];
        sql($sql);
    }
    if ($type == "del") {

        $data1 = sql("select s1, s2, s3, jetztdran from spiele where id = " . $_POST['s'] . ";");
        while ($row = pg_fetch_row($data1)) {

            $s1 = json_decode($row[0], false);
            $s2 = json_decode($row[1], false);
            $s3 = json_decode($row[2], false);
            $jetztdran = $row[3];
        }
        $data_name = gettokendata();
        $name = $data_name->name;
        switch ($name) {
            case ($s1->name):
                if ($jetztdran == 's1') {
                    $spielername = 's1';
                    del($s1, $spielername, 's2');
                }
                else {
                    echo "error1!";
                    echo $jetztdran;
                }
                break;
            case ($s2->name):
                if ($jetztdran == 's2') {
                    $spieler = $s2;
                    $spielername = 's2';
                    del($s2, $spielername, 's3');
                }
                else {
                    echo "error2!";
                    echo $jetztdran;
                }
                break;
            case ($s3->name):
                if ($jetztdran == 's3') {
                    $spieler = $s3;
                    $spielername = 's3';
                    del($s3, $spielername, 's1');
                }
                else {
                    echo "error3!";
                    echo $jetztdran;
                }
                break;
            default:
                echo("error");
        }

    }
}


tosql();
?>