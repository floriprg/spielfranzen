<?php
function tosql()
{
    function del($spieler, $spielername, $dran)
    {
        $todel = $_POST['to_del'];
        $todel = substr($todel, -9);
        $s = $_POST['s'];
        $usercards = sql("select s" . $spielername . "->>'karten' as karten, ablegkarten, trumpf from spiele where id = " . $s);
        while ($row = pg_fetch_row($usercards)) {

            $user = $row[0];
            $farbe = explode(",", trim($row[1], '{}'));
            $trumpf = $row[2];
            $ablegkarten = explode(",", trim($row[1], '{/}'));
        }
        switch ($spielername) {
            case 1:
                $arr = '{"' . $todel . '","' . $ablegkarten[1] . '", "' . $ablegkarten[2] . '"}';
            case 2:
                $arr = '{"' . $ablegkarten[0] . '","' . $todel . '", "' . $ablegkarten[2] . '"}';
            case 3:
                $arr = '{"' . $ablegkarten[0] . '","' . $ablegkarten[1] . '", "' . $todel . '"}';
        }
        //wenn spieler weder farbe noch trumpf hat    |||||||||||||||||||||||||||||||||||||||||||||||||| wenn er farbe zugegeben hat||||||||||||||||||||||||||||||wenn er farbe nicht hat und trumpf zugibt
        if (((strpos($user, substr($farbe[0], -8, 4)) == false) && (strpos($user, $trumpf) == false)) || (strpos($todel, substr($farbe[0], -8, -4)) !== false) || ((strpos($todel, $trumpf) !== false) && (strpos($user, substr($farbe[0], -8, 4)) == false))) {
            $spieler->karten = array_values(array_diff($spieler->karten, [$todel]));
            $sqlstring = "update spiele set s" . $spielername . "= '" . json_encode($spieler) . "', jetztdran= '" . $dran . "', ablegkarten = '" . $arr . "' where id = " . $s;
            echo $sqlstring;
            sql($sqlstring);
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
                    $spielername = 1;
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
                    $spielername = 2;
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
                    $spielername = 3;
                    del($s3, $spielername, 's1');
                }
                else {
                    echo "error3!";
                    echo $jetztdran;
                }
                break;
            default:
                echo ("error");
        }

    }
}


tosql();
?>