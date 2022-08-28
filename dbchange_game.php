<?php
require "config.php";
// if (isset($_POST['s'])) {
$s = $_POST['s'];
$data = sql("select * from spiele  where  id = " . $s);
while ($row = pg_fetch_row($data)) {
    $data2 = "$row[0]$row[1]$row[2]$row[3]$row[4]$row[5]$row[6]$row[7]$row[8]$row[9]$row[10]$row[11]$row[12]$row[13]$row[14]$row[15]$row[16]$row[17]";
}
echo $data2;
// }
?>