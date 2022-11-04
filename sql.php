<?php
function karte_legen_hFun($jetztdran, $spieler, $s, $s2, $spielername)
{
    if ($jetztdran == $s) {
        del($spieler, $spielername, $s2);
    } else {
        echo "error: " . $s;
        echo $jetztdran;
    }
}
function karte_legen()
{

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
            karte_legen_hFun($jetztdran, $s1, 's1', 's2', 1);
            break;
        case ($s2->name):
            //wenn der spieler s2 ist
            karte_legen_hFun($jetztdran, $s2, 's2', 's3', 2);
            break;
        case ($s3->name):
            //wenn der spieler s3 ist
            karte_legen_hFun($jetztdran, $s3, 's3', 's1', 3);
            break;
        default:
            echo ("error");
    }

}
function tosql()
{
    require "config.php";
    $type = $_POST['type'];
    if ($type == "ins") {
        $sql = $_POST['sql'];
        sql($sql);
    }
    if ($type == "del") {
        //karte legen   
        karte_legen();
    }
}


function punkte_dieses_stiches($spieler)
{
    $data = sql("select " . $spieler . ", ablegkarten[0], ablegkarten[1], ablegkarten[2] from spiele where id =" . $_POST['s']);
    while ($row = pg_fetch_row($data)) {
        $s = json_decode($row[0]);
        $a1 = intval(substr($row[1], -9, 1));
        $a2 = intval(substr($row[2], -9, 1));
        $a3 = intval(substr($row[3], -9, 1));
    }
    if (isset($s->punkte)) {
        $s->punkte = intval($s->punkte) + $a1 + $a2 + $a3;
    } else {
        //TODO punkte sind anders
        $s->punkte = $a1 + $a2 + $a3;
    }
    if (isset($s->stiche)) {
        $s->stiche = intval($s->stiche) + 1;
    } else {
        $s->stiche = $a1 + $a2 + $a3;
    }
    //sql("update spiele set " . $spieler . " = " . json_encode($s) . " where id = " . $_POST['s']);
}

function del_hFun($arr2, $arr, $ablegkarten, $todel, $spielrunde, $user, $farbe, $spielstarterderrunde, $spieler, $spielername, $trumpf, $s, $spielstarter, $a1, $a2, $jetztdran)
{
    $erster = false;
    if ((($ablegkarten[0] != "keine") && ($ablegkarten[1] != "keine") && ($ablegkarten[2] != "keine")) || (($ablegkarten[0] == "keine") && ($ablegkarten[1] == "keine") && ($ablegkarten[2] == "keine"))) { //wenn alle besetzt sind
        $erster = true;
        $arr = $arr2;
        sql("update spiele set spielstarterderrunde = " . $spielstarter . " where id = " . $s);
    } else {
        if ((($ablegkarten[$a1] != "keine")) && (($ablegkarten[$a2] != "keine"))) {
            $spielrunde++;
            $drei_karten = [$spielstarter, $a2, $a1];
            $jetztdran = "s" . ($drei_karten[stichmacher($todel, $ablegkarten[$a2], $ablegkarten[$a1], $trumpf)] + 1);
            echo $todel, $ablegkarten[$a1], $ablegkarten[$a2], $a1, $a2;
            //punkte_dieses_stiches($dran);
        }
        $erster = false;
    }
    //wenn spieler weder farbe noch trumpf hat |||||||||||||||||||||||||||||||||||||||||||||||||| wenn er farbe zugegeben hat||||||||||||||||||||||||||||||wenn er farbe nicht hat und trumpf zugibt
    if (($erster == true) || ((strpos($user, substr($farbe[$spielstarterderrunde], -8, 4)) == false) && (strpos($user, $trumpf) == false)) || (strpos($todel, substr($farbe[$spielstarterderrunde], -8, -4)) !== false) || ((strpos($todel, $trumpf) !== false) && (strpos($user, substr($farbe[$spielstarterderrunde], -8, 4)) == false))) {
        echo $jetztdran;
        $spieler->karten = array_values(array_diff($spieler->karten, [$todel]));
        $sqlstring = "update spiele set s" . $spielername . "= '" . json_encode($spieler) . "', jetztdran= '" . $jetztdran . "',
    spielrunde = " . $spielrunde . ", ablegkarten = '" . $arr . "' where id = " . $s;

        sql($sqlstring);
    } else {
        echo "err";
    }
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
    switch ($spielername) {
        case '1':
            $arr = '{"' . $todel . '","' . $ablegkarten[1] . '", "' . $ablegkarten[2] . '"}';
            $arr2 = '{"' . $todel . '","keine", "keine"}';
            del_hFun($arr2, $arr, $ablegkarten, $todel, $spielrunde, $user, $farbe, $spielstarterderrunde, $spieler, $spielername, $trumpf, $s, 0, 1, 2, $jetztdran);
            break;
        case '2':
            $arr = '{"' . $ablegkarten[0] . '","' . $todel . '", "' . $ablegkarten[2] . '"}';
            $arr2 = '{"keine","' . $todel . '", "keine"}';
            del_hFun($arr2, $arr, $ablegkarten, $todel, $spielrunde, $user, $farbe, $spielstarterderrunde, $spieler, $spielername, $trumpf, $s, 1, 2, 0, $jetztdran);
            break;
        case '3':
            $arr = '{"' . $ablegkarten[0] . '","' . $ablegkarten[1] . '", "' . $todel . '"}';
            $arr2 = '{"keine","keine", "' . $todel . '"}';
            del_hFun($arr2, $arr, $ablegkarten, $todel, $spielrunde, $user, $farbe, $spielstarterderrunde, $spieler, $spielername, $trumpf, $s, 2, 0, 1, $jetztdran);
            break;
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
    if (substr($a3, -8, 4) == $trumpf) {
        $trumpfkartenspieler[] = $a3;
        $trumpfkarten[] = substr($a3, -9, 1);
    }
    if (($trumpf == "") || (count($trumpfkarten) == 0)) { //wenn es keinen Trumpf gibt (Bei mord oder Bettl) oder keiner Trumpf gelegt hat
        switch (max(substr($a1, -9, 1), substr($a2, -9, 1), substr($a3, -9, 1))) {


            ///FALSSCH!!!!!!!!!!


            case substr($a1, -9, 1):
                $toreturn = 0;
                break;
            case substr($a2, -9, 1):
                $toreturn = 1;
                break;
            case substr($a3, -9, 1):
                $toreturn = 2;
                break;
        }
    } else {
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
                $toreturn = 0;
                break;
            case $a2:
                $toreturn = 1;
                break;
            case $a3:
                $toreturn = 2;
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