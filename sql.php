<?php
function tosql()
{
    function del($spieler, $spielername, $dran) //löscht karte und fügt sie zu ablegkarten hinzu

    {
        $todel = $_POST['to_del'];
        $todel = substr($todel, -9);
        $s = $_POST['s'];
        $usercards = sql("select s" . $spielername . "->>'karten' as karten, ablegkarten, trumpf, spielrunde from spiele where id = " . $s);
        while ($row = pg_fetch_row($usercards)) {
            $user = $row[0];
            $farbe = explode(",", trim($row[1], '{}'));
            $trumpf = $row[2];
            $ablegkarten = explode(",", trim($row[1], '{/}'));
            $spielrunde = $row[3];
        }

        switch ($spielername) {
            /////////////////////////////////////////////////////////////////////////
            //////Macht keinen SINN!!!
            case '1':

                $arr = '{"' . $todel . '","' . $ablegkarten[$spielrunde * 1] . '", "' . $ablegkarten[$spielrunde * 2] . '"}';
                if ((($ablegkarten[$spielrunde * 1] != "keine") && ($ablegkarten[$spielrunde * 1] != "null")) && (($ablegkarten[$spielrunde * 2] != "keine") && ($ablegkarten[$spielrunde * 2] != "null"))) {
                    $spielrunde++;
                }
                break;
            case '2':
                $arr = '{"' . $ablegkarten[$spielrunde * 0] . '","' . $todel . '", "' . $ablegkarten[$spielrunde * 2] . '"}';
                break;
            case '3':
                $arr = '{"' . $ablegkarten[$spielrunde * 0] . '","' . $ablegkarten[$spielrunde * 1] . '", "' . $todel . '"}';
                break;
        }
        //wenn spieler weder farbe noch trumpf hat    |||||||||||||||||||||||||||||||||||||||||||||||||| wenn er farbe zugegeben hat||||||||||||||||||||||||||||||wenn er farbe nicht hat und trumpf zugibt
        if (((strpos($user, substr($farbe[0], -8, 4)) == false) && (strpos($user, $trumpf) == false)) || (strpos($todel, substr($farbe[0], -8, -4)) !== false) || ((strpos($todel, $trumpf) !== false) && (strpos($user, substr($farbe[0], -8, 4)) == false))) {
            $spieler->karten = array_values(array_diff($spieler->karten, [$todel]));
            $sqlstring = "update spiele set s" . $spielername . "= '" . json_encode($spieler) . "', jetztdran= '" . $dran . "', ablegkarten = '" . $arr . "' where id = " . $s;
            sql($sqlstring);
        }
        else {
            echo "err";
        }
    }
    require "config.php";
    $type = $_POST['type'];
    if ($type == "ins") {
        $sql = $_POST['sql'];
        sql($sql);
    }
    if ($type == "del") {
        //wenn gelöscht werden soll
        $data1 = sql("select s1, s2, s3, jetztdran from spiele where id = " . $_POST['s'] . ";");
        while ($row = pg_fetch_row($data1)) {
            //s1, bzw s2, s3 sind spielerobjekte
            $s1 = json_decode($row[0], false);
            $s2 = json_decode($row[1], false);
            $s3 = json_decode($row[2], false);
            $jetztdran = $row[3];
        }
        $data_name = gettokendata(); //gibt token (gespeichert in Cockie) zurück
        $name = $data_name->name;
        switch ($name) {
            //wenn der spieler s1 ist
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
                //wenn der spieler s2 ist
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
                //wenn der spieler s3 ist
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