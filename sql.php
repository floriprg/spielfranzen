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


function punkte_dieses_stiches($spieler)
{
    $data = sql("select " . $spieler . ", ablegkarten[1], ablegkarten[2], ablegkarten[3] from spiele where id =" . $_POST['s']);
    while ($row = pg_fetch_row($data)) {
        $s = json_decode($row[0]);
        $a1 = intval(substr($row[1], -9, 1));

        $a2 = intval(substr($row[2], -9, 1));
        $a3 = intval(substr($row[3], -9, 1));
    }
    if (isset($s->punkte)) {
        $s->punkte = intval($s->punkte) + $a1 + $a2 + $a3;
    }
    else {
        //TODO punkte sind anders
        $s->punkte = $a1 + $a2 + $a3;
    }
    if (isset($s->stiche)) {
        $s->stiche = intval($s->stiche) + 1;
    }
    else {
        $s->stiche = $a1 + $a2 + $a3;
    }
//sql("update spiele set " . $spieler . " = " . json_encode($s) . " where id = " . $_POST['s']);
}

function del($spieler, $spielername, $dran) //löscht karte und fügt sie zu ablegkarten hinzu

{
    $jetztdran = $dran;
    $todel = $_POST['to_del'];
    $todel = substr($todel, -9);
    $s = $_POST['s'];
    $usercards = sql("select s" . $spielername . "->>'karten' as karten, ablegkarten, trumpf, spielrunde, spielstarterderrunde from spiele where id = " . $s);
    while ($row = pg_fetch_row($usercards)) {
        $user = $row[0];
        $farbe = explode(",", trim($row[1], '{}'));
        $trumpf = $row[2];
        $ablegkarten = explode(",", trim($row[1], '{/}'));
        $spielrunde = $row[3];
        $spielstarterderrunde = $row[4];
    }
    $erster = false;
    switch ($spielername) {
        case '1':
            if (($ablegkarten[0] != "keine") && ($ablegkarten[1] != "keine") && ($ablegkarten[2] != "keine")) { //wenn alle besetzt sind
                $arr = '{"' . $todel . '","keine", "keine"}';
                $erster = true;
                sql("update spiele set spielstarterderrunde = 0 where id = " . $s);
            }
            else {
                $arr = '{"' . $todel . '","' . $ablegkarten[1] . '", "' . $ablegkarten[2] . '"}';
                if ((($ablegkarten[1] != "keine")) && (($ablegkarten[2] != "keine"))) {
                    $spielrunde++;
                    $jetztdran = stichmacher($todel, $ablegkarten[1], $ablegkarten[2], $trumpf);
                //punkte_dieses_stiches($dran);
                }
                $erster = false;
            }
            break;
        case '2':
            if (($ablegkarten[0] != "keine") && ($ablegkarten[1] != "keine") && ($ablegkarten[2] != "keine")) { //wenn alle besetzt sind
                $arr = '{"keine","' . $todel . '", "keine"}';
                $erster = true;
                sql("update spiele set spielstarterderrunde = 1 where id = " . $s);
            }
            else {
                $arr = '{"' . $ablegkarten[0] . '","' . $todel . '", "' . $ablegkarten[2] . '"}';
                if ((($ablegkarten[0] != "keine")) && (($ablegkarten[2] != "keine"))) { //wenn er letzer in der runde ist
                    $spielrunde++;
                    $jetztdran = stichmacher($ablegkarten[0], $todel, $ablegkarten[2], $trumpf);
                //punkte_dieses_stiches($dran);
                }
                $erster = false;
            }
            break;
        case '3':
            if (($ablegkarten[0] != "keine") && ($ablegkarten[1] != "keine") && ($ablegkarten[2] != "keine")) { //wenn alle besetzt sind
                $arr = '{"keine","keine", "' . $todel . '"}';
                $erster = true;
                sql("update spiele set spielstarterderrunde = 2 where id = " . $s);
            }
            else {
                $arr = '{"' . $ablegkarten[0] . '","' . $ablegkarten[1] . '", "' . $todel . '"}';
                if ((($ablegkarten[0] != "keine")) && (($ablegkarten[1] != "keine"))) {
                    $spielrunde++;
                    $jetztdran = stichmacher($ablegkarten[0], $ablegkarten[1], $todel, $trumpf);
                //punkte_dieses_stiches($dran);
                }
                $erster = false;
            }
            break;
    }
    //wenn spieler weder farbe noch trumpf hat    |||||||||||||||||||||||||||||||||||||||||||||||||| wenn er farbe zugegeben hat||||||||||||||||||||||||||||||wenn er farbe nicht hat und trumpf zugibt
    if ($erster == true || ((strpos($user, substr($farbe[$spielstarterderrunde], -8, 4)) == false) && (strpos($user, $trumpf) == false)) || (strpos($todel, substr($farbe[$spielstarterderrunde], -8, -4)) !== false) || ((strpos($todel, $trumpf) !== false) && (strpos($user, substr($farbe[$spielstarterderrunde], -8, 4)) == false))) {
        echo $jetztdran;
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
    $toreturn = "";
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
    if (($trumpf == "") || (count($trumpfkarten) == 0)) { //wenn es keinen Trumpf gibt (Bei mord oder Bettl) oder keiner Trumpf gelegt hat
        switch (max(substr($a1, -9, 1), substr($a2, -9, 1), substr($a3, -9, 1))) {
            case substr($a1, -9, 1):
                $toreturn = "s1";
                break;
            case substr($a2, -9, 1):
                $toreturn = "s2";
                break;
            case substr($a3, -9, 1):
                $toreturn = "s3";
                break;
        }
    }
    else {
        //wenn min. ein Spieler trumpf gelegt hat
        $rundengewinner = "";
        switch (max($trumpfkarten)) {
            case substr($trumpfkartenspieler[0], -9, 1):
                $rundengewinner = $trumpfkartenspieler[0];
                break;
            case substr($trumpfkartenspieler[1], -9, 1):
                $rundengewinner = $trumpfkartenspieler[1];
                break;
            case substr($trumpfkartenspieler[2], -9, 1):
                $rundengewinner = $trumpfkartenspieler[2];
                break;
        }
        switch ($rundengewinner) {
            case $a1:
                $toreturn = "s1";
                break;
            case $a2:
                $toreturn = "s2";
                break;
            case $a3:
                $toreturn = "s3";
                break;
        }
    }
    return $toreturn;
}


function fertig()
{
    $data = sql("select spielart, spieler, s1, s2, s3 from spiele where id =" . $_POST['s']);
    while ($row = pg_fetch_row($data)) {
        $spielart = $row[0];
        $spieler = $row[1];
        $s1 = $row[2];
        $s2 = $row[3];
        $s3 = $row[4];

    }
    $gegner = [];
    $spielmacher = [];
    switch ($spieler) {
        case 's1':
            $spielmacher[] = $s1;
            $gegner = [$s2, $s3];
            break;
        case 's2':
            $spielmacher[] = $s2;
            $gegner = [$s1, $s3];
            break;
        case 's3':
            $spielmacher[] = $s3;
            $gegner = [$s2, $s1];
            break;
    }
    switch ($spielart) {
        case 5 || 6 || 7 || 8: //bei trumpfspielen
            if (((intval($gegner[0]->punkte) + (intval($gegner[1]->punkte))) > 66)) {
                return true;
            }
            if (intval($spielmacher[0]->punkte > 66)) {
                return true;
            }
            break;
        case 9 || 11:
            if ((intval($spielmacher[0]->stiche)) > 0) {
                return true;
            }
        case 10 || 12:
            if (((intval($gegner[0]->stiche)) > 0) || ((intval($gegner[1]->stiche))) > 0) {
                return true;
            }
    }
    return false;
}


tosql();
?>