<?php
function tosql()
{
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


function del($spieler, $spielername, $dran) //löscht karte und fügt sie zu ablegkarten hinzu

{
    $jetztdran = $dran;
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
    $erster = false;
    switch ($spielername) {

        /////////////////////////////////////////////////////////////////////////
        //////Macht keinen SINN!!!
        case '1':
            if (($ablegkarten[0] != "keine") && ($ablegkarten[1] != "keine") && ($ablegkarten[2] != "keine")) { //wenn alle besetzt sind
                $arr = '{"' . $todel . '","keine", "keine"}';
                $erster = true;
            }
            else {
                $arr = '{"' . $todel . '","' . $ablegkarten[1] . '", "' . $ablegkarten[2] . '"}';
                if ((($ablegkarten[1] != "keine")) && (($ablegkarten[2] != "keine"))) {
                    $spielrunde++;
                    $jetztdran = stichmacher($todel, $ablegkarten[1], $ablegkarten[2], $trumpf);
                }
                break;
            }
        case '2':
            if (($ablegkarten[0] != "keine") && ($ablegkarten[1] != "keine") && ($ablegkarten[2] != "keine")) { //wenn alle besetzt sind
                $arr = '{"keine","' . $todel . '", "keine"}';
                $erster = true;
            }
            else {
                $arr = '{"' . $ablegkarten[0] . '","' . $todel . '", "' . $ablegkarten[2] . '"}';
                if ((($ablegkarten[0] != "keine")) && (($ablegkarten[2] != "keine"))) {
                    $spielrunde++;
                    $jetztdran = stichmacher($ablegkarten[0], $todel, $ablegkarten[2], $trumpf);
                }
                break;
            }
        case '3':
            if (($ablegkarten[0] != "keine") && ($ablegkarten[1] != "keine") && ($ablegkarten[2] != "keine")) { //wenn alle besetzt sind
                $arr = '{"keine","keine", "' . $todel . '"}';
                $erster = true;
            }
            else {
                $arr = '{"' . $ablegkarten[0] . '","' . $ablegkarten[1] . '", "' . $todel . '"}';
                if ((($ablegkarten[0] != "keine")) && (($ablegkarten[1] != "keine"))) {
                    $spielrunde++;
                    $jetztdran = stichmacher($ablegkarten[0], $ablegkarten[1], $todel, $trumpf);
                }
                break;
            }
    }
    //wenn spieler weder farbe noch trumpf hat    |||||||||||||||||||||||||||||||||||||||||||||||||| wenn er farbe zugegeben hat||||||||||||||||||||||||||||||wenn er farbe nicht hat und trumpf zugibt
    if ($erster || ((strpos($user, substr($farbe[0], -8, 4)) == false) && (strpos($user, $trumpf) == false)) || (strpos($todel, substr($farbe[0], -8, -4)) !== false) || ((strpos($todel, $trumpf) !== false) && (strpos($user, substr($farbe[0], -8, 4)) == false))) {
        $spieler->karten = array_values(array_diff($spieler->karten, [$todel]));
        $sqlstring = "update spiele set s" . $spielername . "= '" . json_encode($spieler) . "', jetztdran= '" . $jetztdran . "', spielrunde = " . $spielrunde . ", ablegkarten = '" . $arr . "' where id = " . $s;
        sql($sqlstring);
    }
    else {
        echo "err";
    }
}

function stichmacher($a1, $a2, $a3, $trumpf)
{
    $trumpfkarten = [];
    if (substr($a1, -8, 4) == $trumpf) {
        $trumpfkartenspieler[] = $a1;
        $trumpfkarten[] = substr($a1, -9, 1);
    }
    if (substr($a2, -8, 4) == $trumpf) {
        $trumpfkartenspieler[] = $a2;
        $trumpfkarten[] = substr($a2, -9, 1);
    }
    if (substr($a2, -8, 4) == $trumpf) {
        $trumpfkartenspieler[] = $a3;
        $trumpfkarten[] = substr($a3, -9, 1);
    }
    if (($trumpf == "") || (count($trumpfkarten) == 1)) { //wenn es keinen Trumpf gibt (Bei mord oder Bettl) oder keiner Trumpf gelegt hat
        switch (max(substr($a1, -9, 1), substr($a2, -9, 1), substr($a3, -9, 1))) {
            case substr($a1, -9, 1):
                return 's1';
            case substr($a2, -9, 1):
                return 's2';
            case substr($a3, -9, 1):
                return 's3';
        }
    }
    else {
        //wenn min. ein Spieler trumpf gelegt hat
        $rundengewinner = "";
        switch (max($trumpfkarten)) {
            case substr($trumpfkartenspieler[0], -9, 1):
                $rundengewinner = $trumpfkartenspieler[0];
            case substr($trumpfkartenspieler[1], -9, 1):
                $rundengewinner = $trumpfkartenspieler[1];
            case substr($trumpfkartenspieler[2], -9, 1):
                $rundengewinner = $trumpfkartenspieler[2];
        }
        switch ($rundengewinner) {
            case $a1:
                return 's1';
            case $a2:
                return 's2';
            case $a3:
                return 's3';
        }
    }


}

tosql();
?>