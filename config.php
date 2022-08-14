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
function active()
{
    if (!isset($_COOKIE['to'])) {
        return false;
    }
    $data = gettokendata();
    if ($data == "timeout" || !$data) {
        return false;
    }
    //////s2 und s3 auch
    try{
       $d = sql("select id from spiele where s1->>'name'='" . $data->name . "' or s2->>'name'='" . $data->name . "' or s3->>'name'='" . $data->name . "'");
        if ((pg_num_rows($d) > 0)) {
            echo '
        <li class="nav-item">
            <a class="nav-link " href="game.php">Mein Spiel</a>
        </li>';
        }
    } 
    catch(error_log){
        return "error";
    }
    
}
function gettokendata(){
    try{
        if (!isset($_COOKIE['to'])){
            return false;
        }
        $jwt = $_COOKIE['to'];
        $key = "Hochsteller";
        $user_data = JWT::decode($jwt, new Key($key, 'HS256'));
        $data = $user_data->data;
        return $data;       
    } catch (Exception $e) {
        if ($e->getMessage() == "Expired token") {
            echo '<div class="alert alert-warning" role="alert">Deine Session ist abgelaufen! <a href="login.php">Melde dich bitte erneut an!</a>';
        }
        else {

            // set response code
            http_response_code(401);

            // show error message
            echo json_encode(array(
                "message" => "Access denied.",
                "error" => $e->getMessage()
            ));
            die();
        }
    }
}
?>