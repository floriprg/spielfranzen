<?php
include 'vendor/autoload.php';
require "config.php";
if (!isset($_COOKIE["to"])) {
    echo '<div class="alert alert-warning" role="alert">
        Du bist nicht angemeldet! <a href="login.php">Melde dich an</a>  oder <a href="register.php">registriere dich </a> um ein Spiel zu erstellen oder an einem Spiel teilzunehmen!
        </div>';
}
function spielerstellen()
{
    if (!isset($_COOKIE["to"])) {
        return;
    }
    $to = $_GET['to'];
    header("location: index.php");
    if ($_POST['name'] == "") {
        echo '<div class="alert alert-warning" role="alert">
                Gib einen Namen ein!
                </div>';
    }
    else {
        $string = $_POST['name'];
        if ($string != strip_tags($string)) {
            echo "Sie dürfen keine HTML Tags eingeben!";
        }
        else {
            sql("insert into spiele(name, fertig, erlaubte, s1, s2, s3, kartenausgeteilt)values('" . $_POST['name'] . "', false, '" . $_POST['erlaubte'] . "', '{\"name\":\"offen\"}', '{\"name\":\"offen\"}', '{\"name\":\"offen\"}', false);");
        }
    }
}

function getSpiele()
{
    if (!isset($_COOKIE["to"])) {
        return;
    }
    echo '
    <div class="d-flex flex-wrap">';
    $data = sql("select * from spiele where fertig = false;");
    while ($row = pg_fetch_row($data)) {
        //card item
        $s1 = json_decode($row[4], false);
        $s2 = json_decode($row[5], false);
        $s3 = json_decode($row[6], false);

        echo "
            <div class='card m-3' style='width: 18.25rem;'>
                <div class='card-body'>
                    <h5 class='card-title'>$row[1]</h5>
                    <ul>
                        <li class='" . (($s1->name == 'offen') ? 'text-success' : 'text-danger') . "'>$s1->name</li>
                        <li class='" . (($s2->name == 'offen') ? 'text-success' : 'text-danger') . "'>$s2->name</li>
                        <li class='" . (($s3->name == 'offen') ? 'text-success' : 'text-danger') . "'>$s3->name</li>
                    </ul>
                    Erlaubte:
                    $row[3]
                    <br>
                    <button onclick='window.location = \"game.php?s=$row[0]\"' class='btn btn-primary'>Teilnehmen</button>
                </div>
            </div>
        ";
    }
    echo "
    </div>";
    pg_close();
}
?>
<!DOCTYPE html>
<html lang="de">

<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Spiel Franzen</title>
    <meta name="robots" content="INDEX,FOLLOW">
    <meta name="description"
        content="Spiele Spiel Franzen online gegen echte Gegner! Nimm an einem Spiel teil oder beginne dein eigenes! Für 3 Spieler.">
    <meta name="keywords" content="Spiel Franzen">
    <meta name="author" content="Florian Unterfrauner">
    <meta name="language" content="de">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.2.0/dist/css/bootstrap.min.css" rel="stylesheet"
        integrity="sha384-gH2yIJqKdNHPEq0n4Mqa/HGKIhSkIHeL5AyhkYV8i59U5AR6csBvApHHNl/vI1Bx" crossorigin="anonymous">
    <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9511027260579899"
        crossorigin="anonymous"></script>
    <style src="style.css"></style>
</head>

<body>

    <h1 class="text-center">
        Spiel Franzen
    </h1>
    <ul class="nav nav-tabs justify-content-center">
        <li class="nav-item">
            <button class="nav-link active">Spielen</button>
        </li>
        <li class="nav-item">
            <button class="nav-link "
                onclick=" const params = new Proxy(new URLSearchParams(window.location.search), {get: (searchParams, prop) => searchParams.get(prop),});window.location ='login.php?to=' + params.to + '&s=' + params.s">Anmelden</button>
        </li>
        <li class="nav-item">
            <button class="nav-link"
                onclick=" const params = new Proxy(new URLSearchParams(window.location.search), {get: (searchParams, prop) => searchParams.get(prop),});window.location ='register.php?to=' + params.to + '&s=' + params.s">Registrieren</button>
        </li>
        <li class="nav-item">
            <button class="nav-link"
                onclick=" const params = new Proxy(new URLSearchParams(window.location.search), {get: (searchParams, prop) => searchParams.get(prop),});window.location ='rangliste.php?to=' + params.to + '&s=' + params.s">Rangliste</button>
        </li>
        <li class="nav-item">
            <button class="nav-link"
                onclick=" const params = new Proxy(new URLSearchParams(window.location.search), {get: (searchParams, prop) => searchParams.get(prop),});window.location ='game.php?to=' + params.to + '&s=' + params.s">Mein
                Spiel</button>
        </li>
    </ul>
    <br>
    <div class="container">
        <?php
if (isset($_POST['newgame'])) {
    spielerstellen();
}
?>
        <div class="card card-body">
            <form method="post" autocomplete="nope">
                <div class="form-group">
                    <label for="exampleInputEmail1">Name des Spiels</label>
                    <input type="name" class="form-control" id="exampleInputEmail1" aria-describedby="emailHelp"
                        placeholder="Gib den Namen des Spiels ein" name="name">
                </div>
                Teilnehmen dürfen:
                <div class="form-check">
                    <input class="form-check-input" type="radio" name="erlaubte" value="alle" id="flexRadioDefault1" />
                    <label class="form-check-label" for="flexRadioDefault1">alle</label>
                </div>
                <div class="form-check">
                    <input class="form-check-input" type="radio" name="erlaubte" value="Registrierte"
                        id="flexRadioDefault2" checked />
                    <label class="form-check-label" for="flexRadioDefault2">Registrierte</label>
                </div>
                <div class="form-check">
                    <input class="form-check-input" type="radio" name="erlaubte" value="nur mit Passwort"
                        id="flexRadioDefault3" checked />
                    <label class="form-check-label" for="flexRadioDefault3">nur mit Passwort</label>
                </div>
                <input type="submit" name="newgame" class="btn btn-primary" value="Neues Spiel erstellen">

            </form>
        </div>
    </div>
    <div class="container">
        <?php
getSpiele();
?>
    </div>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.2.0/dist/js/bootstrap.bundle.min.js"
        integrity="sha384-A3rJD856KowSb7dwlZdYEkO39Gagi7vIsF0jrRAoQmDKKtQBHUuLZ9AsSv4jD4Xa" crossorigin="anonymous">
    </script>
    <script src="index.js"></script>
</body>

</html>