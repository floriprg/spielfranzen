<?php
header('Access-Control-Allow-Origin:*');
header('Access-Control-Allow-Method:POST');
use \Firebase\JWT\JWT;

include 'vendor/autoload.php';
require "config.php";
passwortvergessen();

function passwortvergessen(){
    if (isset($_POST["pwdforget"])){
        header("location: login.php");
        $email = $_POST['pwdforgetemail'];
        $data = sql("select email from users where email = '" . $email . "';");
        $emailcheck = pg_num_rows($data);
        if ($emailcheck == 1) {
            $msg = "Gib ein neues Passwort ein!";
            $headers = "From: flori.konto2@gmail.com";
            mail($email, "Neues Passwort erstellen", $msg, $headers);
            echo "<div class='alert-success'>Email erfolgreich geschickt!</div>";
        }
        else {
            echo "<div class='alert-danger'>Kein Benutzer mit dieser Email gefunden!</div>";
        }
    }
}
function login(){
    if (isset($_POST['submit'])) {
        header("location: index.php");

        //header("location: login.php");
        if (empty($_POST['pwd']) || empty($_POST['username'])){
            '<div class="alert alert-warning" role="alert">
           Fülle alle Felder aus
            </div>';
            return false;
        }
        if ($_POST['pwd'] != strip_tags($_POST['pwd']) || $_POST['username'] != strip_tags($_POST['username'])) {
            echo '<div class="alert alert-danger" role="alert">
            Sie dürfen keine HTML Tags eingeben!
            </div>';
            return false;
        }
        $hashpassword = sha512($_POST['pwd']);
        $username = pg_escape_string($_POST['username']);
        $sql = "select id, username, email from users where username = '" . $username . "' and pwd ='" . $hashpassword . "'";
        $data = sql($sql);
        $login_check = pg_num_rows($data);
        $i = 0;
        while ($row = pg_fetch_row($data)) {
            $i++;
            $id = $row[0];
            $name = $row[1];
            $email = $row[2];
        }
        if ($login_check > 0) {
            //mit jwt
            $payload = [
                'iss' => "spiel-franzen.herokuapp.com",
                'aud' => 'www.spiel-franzen.herokuapp.com',
                'exp' => time() + 1000, //10 mint
                'data' => [
                    'id' => $id,
                    'name' => $name,
                    'email' => $email,
                ],
            ];
            $secret_key = "Hochsteller";
            $jwt = JWT::encode($payload, $secret_key, 'HS256');
            $random_number = bin2hex(openssl_random_pseudo_bytes(10));
            $jti = hash('sha256', serialize($jwt) . $random_number);

            setcookie("to", $jwt, [
                'expires' => 0,
                'secure' => true,
                'httponly' => true,
                'samesite' => 'Strict',
            ]);
            echo("<script>window.location = 'index.php'</script>");
            exit(1);
        }
        else {
            echo '<div class="alert alert-danger" role="alert">
            Benutzername oder Passwort sind falsch!
            </div>';
        }   
     }
}
?>
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.2.0/dist/css/bootstrap.min.css" rel="stylesheet"
        integrity="sha384-gH2yIJqKdNHPEq0n4Mqa/HGKIhSkIHeL5AyhkYV8i59U5AR6csBvApHHNl/vI1Bx" crossorigin="anonymous">
    <link rel="stylesheet" href="style.css">
</head>

<body>
    <h1 class="text-center">
        Anmelden
    </h1>
    <ul class="nav nav-tabs justify-content-center">
        <ul class="nav nav-tabs justify-content-center">
            <li class="nav-item">
                <a class="nav-link" href="index.php">Spielen</a>
            </li>
            <li class="nav-item">
                <a class="nav-link active" href="login.php">Anmelden</a>
            </li>
            <li class="nav-item">
                <a class="nav-link" href="register.php">Registrieren</a>
            </li>
            <li class="nav-item">
                <a class="nav-link" href="rangliste.php">Rangliste</a>
            </li>
            <li class="nav-item">
                <a class="nav-link" href="game.php">Mein Spiel</a>
            </li>
        </ul>
    </ul>
    <section class="">
        <?php login();?>
        <div class="container-fluid h-custom">
            <div class="row d-flex justify-content-center align-items-center h-100">
                <div class="col-md-9 col-lg-6 col-xl-5">
                    <img src="https://mdbcdn.b-cdn.net/img/Photos/new-templates/bootstrap-login-form/draw2.webp"
                        class="img-fluid" alt="Sample image">
                </div>
                <div class="col-md-8 col-lg-6 col-xl-4 offset-xl-1">
                    <form method="post" autocomplete="nope">
                        <div class="d-flex flex-row align-items-center justify-content-center justify-content-lg-start">
                            <p class="lead fw-normal mb-0 me-3">Anmelden mit</p>
                            <button type="button" class="btn btn-primary btn-floating mx-1">
                                <i class="bi bi-facebook"></i>
                            </button>

                            <button type="button" class="btn btn-primary btn-floating mx-1">
                                <i class="fab fa-twitter"></i>
                            </button>

                            <button type="button" class="btn btn-primary btn-floating mx-1">
                                <i class="fab fa-linkedin-in"></i>
                            </button>
                        </div>

                        <div class="divider d-flex align-items-center my-4">
                            <p class="text-center fw-bold mx-3 mb-0">Or</p>
                        </div>

                        <!-- Email input -->
                        <div class="form-outline mb-4">
                            <input name="username" type="text" id="form3Example3" class="form-control form-control-lg"
                                placeholder="Gib deinen Benutzernamen ein" />
                            <label class="form-label" for="form3Example3">Benutzername</label>
                        </div>

                        <!-- Password input -->
                        <div class="form-outline mb-3">
                            <input name="pwd" type="password" id="form3Example4" class="form-control form-control-lg"
                                placeholder="Enter password" />
                            <label class="form-label" for="form3Example4">Passwort</label>
                        </div>

                        <div class="d-flex flex-column justify-content-between ">
                            <input type="submit" name="submit" class="btn btn-primary" value="Anmelden">
                            <br>
                            <p>
                                <a class="" type="button" data-bs-toggle="collapse" data-bs-target="#collapseExample"
                                    aria-expanded="false" aria-controls="collapseExample">
                                    Passwort vergessen?
                                </a>
                            </p>

                            <div class="collapse" id="collapseExample">
                                <div class="card card-body">
                                    <form method="post" autocomplete="nope">
                                        <!-- Email input -->
                                        <div class="form-outline mb-4">
                                            Email<input type="text" name="pwdforgetemail" class="form-control"
                                                placeholder="Gib deine Email ein" />
                                        </div>
                                        <input type="submit" name="pwdforget" class="btn btn-primary"
                                            value="Zugangsdaten wiederherstellen">
                                    </form>
                                </div>
                            </div>

                    </form>
                </div>
            </div>
        </div>
    </section>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.2.0/dist/js/bootstrap.bundle.min.js"
        integrity="sha384-A3rJD856KowSb7dwlZdYEkO39Gagi7vIsF0jrRAoQmDKKtQBHUuLZ9AsSv4jD4Xa" crossorigin="anonymous">
    </script>
    <script src="index.js"></script>
</body>

</html>