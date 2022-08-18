<?php
function tosql()
{

    function del($spieler, $spielername)
    {
        echo json_encode($spieler->karten[0]);
        $todel = $_POST['to_del'];
        $todel = substr($todel, -10);
        echo $todel;
        $s = $_POST['s'];
        //sql("update  spiele set ablegkarten = ablegkarten || '{" . $_POST['to_del'] . "}' where id = " . $s);
        echo count($spieler->karten);
        $karten = array();
        for ($i = 0; $i++; $i < (count($spieler->karten))) {
            if (($spieler->karten[$i]) != $todel) {
                $karten[] = $spieler->karten[$i];
            }
            else {
                echo "hallo";
            }

        }
        $spieler->karten = $karten;
        echo(print_r($karten));
        echo json_encode($spieler);
    //sql("update spiele set " . $spielername . "= '" . json_encode($spieler) . "' where id = " . $s);
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
        echo $name;
        echo $s1->name;
        echo $s2->name;
        echo $s3->name;

    }
}


tosql();
?>