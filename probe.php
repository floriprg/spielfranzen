<?php
function neuekarten()
{
    $karten = array("1 laub.jpg", "1 sche.jpg", "1 eich.jpg", "1 herz.jpg", "2 laub.jpg", "2 sche.jpg", "2 eich.jpg", "2 herz.jpg", "3 laub.jpg", "3 sche.jpg", "3 eich.jpg", "3 herz.jpg", "4 laub.jpg", "4 sche.jpg", "4 eich.jpg", "4 herz.jpg", "5 eich.jpg", "5 herz.jpg", "5 laub.jpg", "5 sche.jpg", "7 eich.jpg", "7 herz.jpg", "7 laub.jpg", "7 sche.jpg", "8 eich.jpg", "8 herz.jpg", "8 laub.jpg", "8 sche.jpg", "9 eich.jpg", "9 herz.jpg", "9 laub.jpg", "9 sche.jpg", "weli.jpg");
    $zufallskarten = [];
    for ($i = 0; $i < 33; $i++) {
        $zahl = rand(0, (count($karten) - 1));
        $zufallskarten[] = $karten[$zahl];
        array_splice($karten, $zahl, 1);
    }
    return $zufallskarten;
}
$zufallskarten = neuekarten();
$s1->karten = array_splice($zufallskarten, 0, 10);
$s2->karten = array_splice($zufallskarten, 0, 10);
$s3->karten = array_splice($zufallskarten, 0, 10);
$talon = $zufallskarten;

print_r($s1);
echo "<br>";
print_r($s2);
echo "<br>";
print_r($s3);
echo "<br>";
print_r($talon);
?>