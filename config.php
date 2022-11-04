<?php
use \Firebase\JWT\JWT;
use Firebase\JWT\Key;
include 'vendor/autoload.php';
header('Access-Control-Allow-Origin:*');
header('Access-Control-Allow-Method:POST');
define("JWT_ALGO", "HS512");
function sql($sql)
{
    //pg_connect("trusty-server-367014:europe-west8:spielfranzen port=5432 dbname=spielfranzen user=p1092094200465-1mxt3h@gcp-sa-cloud-sql.iam.gserviceaccount.com password=g!#+neznarfleips");
    return pg_query(pg_connect("host=ec2-34-242-84-130.eu-west-1.compute.amazonaws.com port=5432 dbname=d2stjk7j24ibr user=ziekgdhkxuqkta password=c7029fdf0002ed1705c9fbf741c8a9dcf6fc3d4ca04f4c1957d7d7b3a1277543"), $sql);
}

function sec_sql($sql){
    try {
        $dsn = "host=ec2-34-242-84-130.eu-west-1.compute.amazonaws.com; port=5432; dbname=d2stjk7j24ibr;";
        // make a database connection
        $user = "ziekgdhkxuqkta";
        $password = "c7029fdf0002ed1705c9fbf741c8a9dcf6fc3d4ca04f4c1957d7d7b3a1277543";
        $pdo = new PDO($dsn, $user, $password, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
        if ($pdo) {
            echo "Connected to the database successfully!";
        }
        $stmt = $pdo->prepare($sql);
        return $stmt->execute();
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