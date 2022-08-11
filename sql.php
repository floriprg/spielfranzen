<?php
require "config.php";
$sql = $_POST['sql'];
$type = $_POST['type'];
if ($type == "ins") {
    sql($sql);
}
else {
    $data = sql($sql);
    while ($row = pg_fetch_row($data)) {
        echo $row[0];
    }
}
?>