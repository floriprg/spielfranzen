<?php
header('Access-Control-Allow-Origin:*');
header('Access-Control-Allow-Method:POST');
use \Firebase\JWT\JWT;

include 'vendor/autoload.php';
require "config.php";
$now = time();

if (isset($_POST['submit']) && !empty($_POST['submit'])) {
    //header("location: login.php");
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
            'iss' => "localhost",
            'aud' => 'localhost',
            'exp' => time() + 1000, //10 mint
            'data' => [
                'id' => $id,
                'name' => $name,
                'email' => $email,
            ],
        ];
        $secret_key = "Hochsteller";
        $jwt = JWT::encode($payload, $secret_key, 'HS256');
        echo json_encode([
            'status' => 1,
            'jwt' => $jwt,
            'message' => 'Login Successfully',
        ]);
        echo("<script>window.location = 'index.php?to=$jwt'</script>");
        exit(1);
    }
    else {
        echo "Invalid Details";
    }
}

function newtoken($id)
{
    $token = openssl_random_pseudo_bytes(100);
    $token = bin2hex($token);
    $time = time() + 3600;
    $sql1 = "select * from users where token = '" . $token . "';";
    $data = sql($sql1);
    $tokencheck = pg_num_rows($data);
    if ($tokencheck == 0) {
        $sql2 = "UPDATE users set token = '" . $token . "' WHERE  id = {$id}; UPDATE users set tokentimeout =  $time";
        sql($sql2);
        return $token;
    }
    else {
        newtoken($id);
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
        <li class="nav-item">
            <button class="nav-link "
                onclick=" const params = new Proxy(new URLSearchParams(window.location.search), {get: (searchParams, prop) => searchParams.get(prop),});window.location ='index.php?to=' + params.to;">Spielen</button>
        </li>
        <li class="nav-item">
            <button class="nav-link active"
                onclick=" const params = new Proxy(new URLSearchParams(window.location.search), {get: (searchParams, prop) => searchParams.get(prop),});window.location ='login.php?to=' + params.to;">Anmelden</button>
        </li>
        <li class="nav-item">
            <button class="nav-link"
                onclick=" const params = new Proxy(new URLSearchParams(window.location.search), {get: (searchParams, prop) => searchParams.get(prop),});window.location ='register.php?to=' + params.to;">Registrieren</button>
        </li>
        <li class="nav-item">
            <button class="nav-link"
                onclick=" const params = new Proxy(new URLSearchParams(window.location.search), {get: (searchParams, prop) => searchParams.get(prop),});window.location ='rangliste.php?to=' + params.to;">Rangliste</button>
        </li>
        <li class="nav-item">
            <button class="nav-link"
                onclick=" const params = new Proxy(new URLSearchParams(window.location.search), {get: (searchParams, prop) => searchParams.get(prop),});window.location ='game.php?to=' + params.to;">Mein
                Spiel</button>
        </li>
    </ul>
    <section class="vh-100">
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

                        <div class="d-flex justify-content-between align-items-center">
                            <!-- Checkbox -->
                            <div class="form-check mb-0">
                                <input class="form-check-input me-2" type="checkbox" value="" id="form2Example3" />
                                <label class="form-check-label" for="form2Example3">
                                    Remember me
                                </label>
                            </div>
                            <a href="#!" class="text-body">Forgot password?</a>
                        </div>

                        <br>
                        <input type="submit" name="submit" class="btn btn-primary" value="Anmelden">
                        <p class="small fw-bold mt-2 pt-1 mb-0">Don't have an account? <a href="register.php"
                                class="link-danger">Register</a></p>


                    </form>
                </div>
            </div>
        </div>
        <div
            class="d-flex flex-column flex-md-row text-center text-md-start justify-content-between py-4 px-4 px-xl-5 bg-primary">
            <!-- Copyright -->
            <div class="text-white mb-3 mb-md-0">
                Copyright © 2020. All rights reserved.
            </div>
            <!-- Copyright -->

            <!-- Right -->
            <div>
                <a href="facebook.com" class="text-white me-4">
                    <i class="fab fa-facebook-f"></i>
                </a>
                <a href="twitter.com" class="text-white me-4">
                    <i class="fab fa-twitter"></i>
                </a>
                <a href="google.com" class="text-white me-4">
                    <i class="fab fa-google"></i>
                </a>
                <a href="linkedin.com" class="text-white">
                    <i class="fab fa-linkedin-in"></i>
                </a>
            </div>
            <!-- Right -->
        </div>
    </section>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.2.0/dist/js/bootstrap.bundle.min.js"
        integrity="sha384-A3rJD856KowSb7dwlZdYEkO39Gagi7vIsF0jrRAoQmDKKtQBHUuLZ9AsSv4jD4Xa" crossorigin="anonymous">
    </script>
    <script src="index.js"></script>
</body>

</html>