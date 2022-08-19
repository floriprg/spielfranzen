<?php
function tosql()
{

    function del($spieler, $spielername)
    {
        $todel = $_POST['to_del'];
        $todel = substr($todel, -10);
        $s = $_POST['s'];
        sql("update  spiele set ablegkarten = ablegkarten || '{" . $todel . "}' where id = " . $s);
        $spieler->karten = array_values(array_diff($spieler->karten, [$todel]));
        sql("update spiele set " . $spielername . "= '" . json_encode($spieler) . "' where id = " . $s);
    }
    require "config.php";
    $type = $_POST['type'];
    if ($type == "ins") {
        $sql = $_POST['sql'];
        sql($sql);
    }
    if ($type == "del") {

        $data1 = sql("select s1, s2, s3 from spiele where id = " . $_POST['s'] . ";");
        while ($row = pg_fetch_row($data1)) {

            $s1 = json_decode($row[0], false);
            $s2 = json_decode($row[1], false);
            $s3 = json_decode($row[2], false);
        }
        $data_name = gettokendata();
        $name = $data_name->name;
        switch ($name) {
            case ($s1->name):
                $spielername = 's1';
                del($s1, $spielername);
                break;
            case ($s2->name):
                $spieler = $s2;
                $spielername = 's2';
                del($s2, $spielername);

                break;
            case ($s3->name):
                $spieler = $s3;
                $spielername = 's3';
                del($s3, $spielername);

        }

    }
}


tosql();
?>