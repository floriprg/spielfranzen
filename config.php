<?php
use \Firebase\JWT\JWT;
use Firebase\JWT\Key;
include 'vendor/autoload.php';
header('Access-Control-Allow-Origin:*');
header('Access-Control-Allow-Method:POST');
define("JWT_ALGO", "HS512");
function sql($sql)
{
    return pg_query(pg_connect("host=surus.db.elephantsql.com port=5432 dbname=ezxcezfz user=ezxcezfz password=BKQzHevfNx0ZB1pORmS3P8ELhVL5R4Qa"), $sql);
}

function sql_login($sql){
    return pg_query(pg_connect("host=surus.db.elephantsql.com port=5432 dbname=bgjwlwho user=bgjwlwho password=wv27u-IX-Xe5mEmOV4Y94zAj_H0SCZdb"), $sql);
}


function sec_sql($sql){
    try {
        $dsn = "pgsql:host=surus.db.elephantsql.com;port=5432;dbname=ezxcezfz;";
        // make a database connection
        $user = "ezxcezfz";
        $password = "BKQzHevfNx0ZB1pORmS3P8ELhVL5R4Qa";
        $pdo = new PDO($dsn, $user, $password, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
        
        $stmt = $pdo->query($sql);
        $user = $stmt->fetch();
        return $user;
    } catch (PDOException $e) {
        die($e->getMessage());
    } finally {
        if ($pdo) {
            $pdo = null;
        }
    }
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
            return false;
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