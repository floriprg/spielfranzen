<?php
require "config.php";
?>
<!DOCTYPE html>
<html lang="de">

<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Spiel Franzen Home</title>
    <link rel="icon" type="image/jpg" href="karten/weliicon.jpg">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.2.0/dist/css/bootstrap.min.css" rel="stylesheet"
        integrity="sha384-gH2yIJqKdNHPEq0n4Mqa/HGKIhSkIHeL5AyhkYV8i59U5AR6csBvApHHNl/vI1Bx" crossorigin="anonymous">
</head>

<body>
    <script>
    if (window.history.replaceState) {
        window.history.replaceState(null, null, window.location.href);
    }
    </script>
    <h1 class="text-center">
        Spiel Franzen Home
    </h1>
    <!-- <nav class="nav nav-pills  flex-sm-row">
        <a class="flex-sm-fill text-sm-center nav-link active" href="home.php">Home</a>
        <a class="flex-sm-fill text-sm-center nav-link" href="index.php">Spielen</a>
        <a class="flex-sm-fill text-sm-center nav-link" href="login.php">Anmelden</a>
        <a class="flex-sm-fill text-sm-center nav-link " href="register.php">Registrieren</a>
        <a class="flex-sm-fill text-sm-center nav-link " href="rangliste.php">Rangliste</a>
        <a class="flex-sm-fill text-sm-center nav-link " href="game.php">Mein Spiel</a>
    </nav>
-->
    <ul class="nav nav-tabs justify-content-center">
        <li class="nav-item">
            <a class="nav-link active" href="home.php">
                Home
            </a>
        </li>
        <li class="nav-item">
            <a class="nav-link" href="index.php">Spielen</a>
        </li>
        <li class="nav-item">
            <a class="nav-link" href="login.php">
                Anmelden
            </a>
        </li>
        <li class="nav-item">
            <a class="nav-link " href="register.php">Registrieren</a>
        </li>
        <li class="nav-item">
            <a class="nav-link" href="rangliste.php">Rangliste</a>
        </li>
        <?php active() ?>
    </ul>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.2.0/dist/js/bootstrap.bundle.min.js"
        integrity="sha384-A3rJD856KowSb7dwlZdYEkO39Gagi7vIsF0jrRAoQmDKKtQBHUuLZ9AsSv4jD4Xa" crossorigin="anonymous">
    </script>
</body>

</html>