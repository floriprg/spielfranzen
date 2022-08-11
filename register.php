<?php

include 'vendor/autoload.php';
require "config.php";
function register()
{
    if (isset($_POST['submit'])) {
        $to = $_GET['to'];
        header("location: register.php");
        if (!empty($_POST['username']) && !empty($_POST['email']) && !empty($_POST['pwd']) && !empty($_POST['pwd2'])) {
            if ($_POST['pwd'] != $_POST['pwd2']) {
                echo '<div class="alert alert-danger" role="alert">
                Passwörter stimmen nicht überein!
                </div>';
                return false;
            }
            if (trim(!empty($_POST["email"]))) {
                echo '<div class="alert alert-danger" role="alert">
                leer
                </div>';
                return false;
            }
            $now = time();
            $sql2 = "select * from users where username ='" . $_POST['username'] . "' OR email='" . sha512(pg_escape_string($_POST['email'])) . "'";
            $data = sql($sql2);
            $login_check = pg_num_rows($data);
            if ($login_check != 0) {
                echo('<div class="alert alert-danger" role="alert">
                    Email oder Benutzername wird bereits verwendet!
                    </div>');
                return false;
            }
            $sql = "insert into users(username,email,pwd)values('" . $_POST['username'] . "','" . sha512(pg_escape_string($_POST['email'])) . "','" . sha512($_POST['pwd']) . "')";
            $ret = sql($sql);
            if ($ret) {
                echo '<div class="alert alert-success" role="alert">
                    Erfolgreich registriert!
                    </div>';
            }
            else {
                echo '<div class="alert alert-danger" role="alert">
                    Etwas ist schiefgelaufen!
                    </div>';
            }
        }
        else {
            echo '<div class="alert alert-warning" role="alert">
            Fülle alle Felder aus!
            </div>';
        }
    }
}

register();
?>
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Registrieren</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.2.0/dist/css/bootstrap.min.css" rel="stylesheet"
        integrity="sha384-gH2yIJqKdNHPEq0n4Mqa/HGKIhSkIHeL5AyhkYV8i59U5AR6csBvApHHNl/vI1Bx" crossorigin="anonymous">
</head>

<body>
    <h1 class="text-center">
        Registrieren
    </h1>
    <ul class="nav nav-tabs justify-content-center">
        <ul class="nav nav-tabs justify-content-center">
            <li class="nav-item">
                <a class="nav-link" href="index.php">Spielen</a>
            </li>
            <li class="nav-item">
                <a class="nav-link" href="login.php">Anmelden</a>
            </li>
            <li class="nav-item">
                <a class="nav-link active" href="register.php">Registrieren</a>
            </li>
            <li class="nav-item">
                <a class="nav-link" href="rangliste.php">Rangliste</a>
            </li>
            <li class="nav-item">
                <a class="nav-link" href="game.php">Mein Spiel</a>
            </li>
        </ul>
    </ul>
    <section class="vh-100" style="background-color: white;">
        <div class="container h-100">
            <div class="row d-flex justify-content-center align-items-center h-100">
                <div class="col-lg-12 col-xl-11">
                    <div class="card text-black" style="border-radius: 25px;">
                        <div class="card-body p-md-5">
                            <div class="row justify-content-center">
                                <div class="col-md-10 col-lg-6 col-xl-5 order-2 order-lg-1">

                                    <p class="text-center h1 fw-bold mb-5 mx-1 mx-md-4 mt-4">Registrieren</p>

                                    <form method="post" autocomplete="nope" class="mx-1 mx-md-4">

                                        <div class="d-flex flex-row align-items-center mb-4">
                                            <i class="fas fa-user fa-lg me-3 fa-fw"></i>
                                            <div class="form-outline flex-fill mb-0">
                                                <input name="username" type="text" id="form3Example1c"
                                                    class="form-control" />
                                                <label class="form-label" for="form3Example1c">Benutzername</label>
                                            </div>
                                        </div>

                                        <div class="d-flex flex-row align-items-center mb-4">
                                            <i class="fas fa-envelope fa-lg me-3 fa-fw"></i>
                                            <div class="form-outline flex-fill mb-0">
                                                <input name="email" type="email" id="form3Example3c"
                                                    class="form-control" />
                                                <label class="form-label" for="form3Example3c">Email</label>
                                            </div>
                                        </div>

                                        <div class="d-flex flex-row align-items-center mb-4">
                                            <i class="fas fa-lock fa-lg me-3 fa-fw"></i>
                                            <div class="form-outline flex-fill mb-0">
                                                <input name="pwd" type="password" id="form3Example4c"
                                                    class="form-control" />
                                                <label class="form-label" for="form3Example4c">Passwort</label>
                                            </div>
                                        </div>

                                        <div class="d-flex flex-row align-items-center mb-4">
                                            <i class="fas fa-key fa-lg me-3 fa-fw"></i>
                                            <div class="form-outline flex-fill mb-0">
                                                <input name="pwd2" type="password" id="form3Example4cd"
                                                    class="form-control" />
                                                <label class="form-label" for="form3Example4cd">Passwort
                                                    wiederholen</label>
                                            </div>
                                        </div>

                                        <div class="form-check d-flex justify-content-center mb-5">
                                            <input class="form-check-input me-2" type="checkbox" value=""
                                                id="form2Example3c" />
                                            <label class="form-check-label" for="form2Example3">
                                                Ich stimme den <a href="nutzungsbedingungen.php">Nutzungsbedingungen</a>
                                                zu
                                            </label>
                                        </div>

                                        <div class="d-flex justify-content-center mx-4 mb-3 mb-lg-4">
                                            <input type="submit" name="submit" class="btn btn-primary"
                                                value="Registrieren">
                                        </div>

                                    </form>

                                </div>
                                <div class="col-md-10 col-lg-6 col-xl-7 d-flex align-items-center order-1 order-lg-2">

                                    <img src="https://mdbcdn.b-cdn.net/img/Photos/new-templates/bootstrap-registration/draw1.webp"
                                        class="img-fluid" alt="Sample image">

                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.2.0/dist/js/bootstrap.bundle.min.js"
        integrity="sha384-A3rJD856KowSb7dwlZdYEkO39Gagi7vIsF0jrRAoQmDKKtQBHUuLZ9AsSv4jD4Xa" crossorigin="anonymous">
    </script>
</body>

</html>