<?php
use \Firebase\JWT\JWT;
use Firebase\JWT\Key;
include 'vendor/autoload.php';
header('Access-Control-Allow-Origin:*');
header('Access-Control-Allow-Method:POST');
define("JWT_ALGO", "HS512");
function sql($sql)
{
    return pg_query(pg_connect("host=ec2-34-242-84-130.eu-west-1.compute.amazonaws.com port=5432 dbname=d2stjk7j24ibr user=ziekgdhkxuqkta password=c7029fdf0002ed1705c9fbf741c8a9dcf6fc3d4ca04f4c1957d7d7b3a1277543"), $sql);
}
function sha512($string)
{
    $h = $string;
    for ($i = 0; $i < 100; $i++) {
        $h = hash('sha512', $h);
    }
    return $h;
}
function tokenoverproofe()
{
    if (isset($_GET['to']) && !($_GET['to'] == "") && !($_GET['to'] == "null")) {
        return true;
    } else {
        return false;
    }
}
function gettokendata(){
    $jwt = $_GET['to'];
    $key = "Hochsteller";
    $user_data = JWT::decode($jwt, new Key($key, 'HS256'));
    $data = $user_data->data;
    return $data;
}
?>