<?php
require "config.php";

$data = sql("select name, s1, s2, s3 from spiele where gestartet = false");
echo "$row[0]$row[1]$row[2]$row[3]";
?>