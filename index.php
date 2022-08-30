<?php
include 'vendor/autoload.php';
require "config.php";
function nichtangemeldet()
{
    if (!isset($_COOKIE["to"])) {
        echo '<div class="alert alert-warning" role="alert">
        Du bist nicht angemeldet! <a href="login.php">Melde dich an</a>  oder <a href="register.php">registriere dich </a> um ein Spiel zu erstellen oder an einem Spiel teilzunehmen!
        </div>';
    }
}

function spielerstellen()
{
    if (!isset($_COOKIE["to"])) {
        return;
    }
    header("location: index.php");
    if ($_POST['name'] == "") {
        echo '<div class="alert alert-warning" role="alert">
                Gib einen Namen ein!
                </div>';
    }
    else {
        $string = $_POST['name'];
        if ($string != strip_tags($string)) {
            echo '<div class="alert alert-warning" role="alert">Sie dürfen keine HTML Tags eingeben!</div>';
        }
        else {
            sql("insert into spiele(gestartet, name, fertig, erlaubte, s1, s2, s3, kartenausgeteilt, anzahl, jetztdran, spielart, gehebt)values(false, '" . $_POST['name'] . "', false, '" . $_POST['erlaubte'] . "', '{\"name\":\"offen\"}', '{\"name\":\"offen\"}', '{\"name\":\"offen\"}', false, '" . $_POST['anzahl'] . "', 's3', 4, true);");
        }
    }
}

function getSpiele()
{
    if (!isset($_COOKIE["to"])) {
        return;
    }
    $data2 = gettokendata();
    if (!$data2) {
        echo '<div class="alert alert-warning" role="alert">Deine Session ist abgelaufen! <a href="login.php">Melde dich bitte erneut an!</a>';
        return false;
    }
    echo '
    <div class="d-flex flex-wrap">';
    $data = sql("select * from spiele where fertig = false;");

    while ($row = pg_fetch_row($data)) {
        //card item
        $s1 = json_decode($row[4], false);
        $s2 = json_decode($row[5], false);
        $s3 = json_decode($row[6], false);
        
        $name = $data2->name;
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
                    Anzahl Spiele:
                    $row[11]
                    <br>
                    <a class='btn btn-primary' href='game.php?s=" . $row[0] . "'>" . (($name == $s1->name || $name == $s2->name || $name == $s3->name) ? 'Wieder teilnehmen' : 'Teilnehmen') . "</a>
                </div>
            </div>
        ";
    }
    echo "
    </>";
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
    <link rel="icon" type="image/jpg" href="karten/weliicon.jpg">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.2.0/dist/css/bootstrap.min.css" rel="stylesheet"
        integrity="sha384-gH2yIJqKdNHPEq0n4Mqa/HGKIhSkIHeL5AyhkYV8i59U5AR6csBvApHHNl/vI1Bx" crossorigin="anonymous">
    <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9511027260579899"
        crossorigin="anonymous"></script>
    <style src="style.css"></style>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jquery/3.5.1/jquery.min.js"></script>

    <link rel="stylesheet" type="text/css"
        href="https://cdn.jsdelivr.net/npm/cookieconsent@3/build/cookieconsent.min.css" />
    <script>
    let data = "";
    let newdata = "";

    function ajax3() {
        $.ajax({
                method: "POST",
                url: "dbchange.php"

            })
            .done(async function(response) {
                data = response;
            });

        setInterval(ajax4, 2000);
    }

    function ajax4() {
        $.ajax({
                method: "POST",
                url: "dbchange.php"
            })

            .done(function(response) {
                newdata = response;
                if (!(newdata == data)) {
                    window.location.reload();
                }
            });
    }
    ajax3();
    </script>
</head>

<body class="">
    <h1 class="text-center">
        Spielen
    </h1>
    <ul class="nav nav-tabs justify-content-center">
        <li class="nav-item">
            <a class="nav-link" href="home.php">
                Home
            </a>
        </li>
        <li class="nav-item">
            <a class="nav-link active" href="index.php">Spielen</a>
        </li>
        <li class="nav-item">
            <a class="nav-link" href="login.php">Anmelden</a>
        </li>
        <li class="nav-item">
            <a class="nav-link " href="register.php">Registrieren</a>
        </li>
        <li class="nav-item">
            <a class="nav-link " href="rangliste.php">Rangliste</a>
        </li>
        <?php active() ?>
    </ul>
    <br>
    <div class="container">

        <?php
nichtangemeldet();
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
                <div class="flex-row d-flex">
                    <div>
                        Teilnehmen dürfen:
                        <div class="form-check">
                            <input class="form-check-input" type="radio" name="erlaubte" value="alle"
                                id="flexRadioDefault1" checked />
                            <label class="form-check-label" for="flexRadioDefault1">alle</label>
                        </div>
                        <div class="form-check">
                            <input class="form-check-input" type="radio" name="erlaubte" value="Registrierte"
                                id="flexRadioDefault2" />
                            <label class="form-check-label" for="flexRadioDefault2">Registrierte</label>
                        </div>
                        <div class="form-check">
                            <input class="form-check-input" type="radio" name="erlaubte" value="nur mit Passwort"
                                id="flexRadioDefault3" />
                            <label class="form-check-label" for="flexRadioDefault3">nur mit Passwort</label>
                        </div>
                    </div>
                    <span style="width: 10vw"></span>
                    <div>
                        Anzahl Spiele:
                        <div class="form-check">
                            <input class="form-check-input" type="radio" name="anzahl" value="3" id="flexRadioDefault1"
                                checked />
                            <label class="form-check-label" for="flexRadioDefault1">3</label>
                        </div>
                        <div class="form-check">
                            <input class="form-check-input" type="radio" name="anzahl" value="6"
                                id="flexRadioDefault2" />
                            <label class="form-check-label" for="flexRadioDefault2">6</label>
                        </div>
                        <div class="form-check">
                            <input class="form-check-input" type="radio" name="anzahl" value="9"
                                id="flexRadioDefault3" />
                            <label class="form-check-label" for="flexRadioDefault3">9</label>
                        </div>
                        <div class="form-check">
                            <input class="form-check-input" type="radio" name="anzahl" value="12"
                                id="flexRadioDefault4" />
                            <label class="form-check-label" for="flexRadioDefault4">12</label>
                        </div>
                    </div>
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
    <script src="https://cdn.jsdelivr.net/npm/cookieconsent@3/build/cookieconsent.min.js" data-cfasync="false"></script>
    <script>
    window.cookieconsent.initialise({
        "palette": {
            "popup": {
                "background": "#216942",
                "text": "#b2d192"
            },
            "button": {
                "background": "#afed71"
            }
        },
        "theme": "edgeless",
        "position": "bottom-right",
        "content": {
            "message": "Diese Webseite verwendet Cookies, um Ihnen ein angenehmeres Surfen zu ermöglichen.",
            "dismiss": "Notwendige Cookies Akzeptieren",
            "link": "Mehr herausfinden",
            "href": "https://www.cookiesandyou.com/"
        }
    });
    </script>
</body>

</html>