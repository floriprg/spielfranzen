<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Spiel Franzen</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.2.0/dist/css/bootstrap.min.css" rel="stylesheet"
        integrity="sha384-gH2yIJqKdNHPEq0n4Mqa/HGKIhSkIHeL5AyhkYV8i59U5AR6csBvApHHNl/vI1Bx" crossorigin="anonymous">
</head>

<body>
    <h1 class="text-center">
        Spiel Franzen
    </h1>
    <ul class="nav nav-tabs justify-content-center">
        <li class="nav-item">
            <a class="nav-link active" aria-current="page" href="index.php">Spielen</a>
        </li>
        <li class="nav-item">
            <a class="nav-link" href="login.php">Anmelden</a>
        </li>
        <li class="nav-item">
            <a class="nav-link" href="register.php">Registrieren</a>
        </li>
        <li class="nav-item">
            <a class="nav-link" href="rangliste.php">Rangliste</a>
        </li>
    </ul>
    <div class="container">
        <?php
$host = getenv('DATABASE_URL');
if ($host == "") {
    $host = "postgres://ziekgdhkxuqkta:c7029fdf0002ed1705c9fbf741c8a9dcf6fc3d4ca04f4c1957d7d7b3a1277543@ec2-34-242-84-130.eu-west-1.compute.amazonaws.com:5432/d2stjk7j24ibr";
}
echo '<div class="d-flex flex-wrap">';
for ($i = 0; $i < 10; $i++) {
    echo '<div class="card m-3" style="width: 18rem;">
  <div class="card-body">
    <h5 class="card-title">Name des Spiels</h5>
    <ul>
        <li>Spieler 1</li>
        <li>Spieler 2</li>
        <li>Spieler 3</li>
    </ul>
   <a href="index.php?s=' . $i . '" class="btn btn-primary">Teilnehmen</a>
  </div>
</div>
';
}
echo "</div>";
?>
    </div>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.2.0/dist/js/bootstrap.bundle.min.js"
        integrity="sha384-A3rJD856KowSb7dwlZdYEkO39Gagi7vIsF0jrRAoQmDKKtQBHUuLZ9AsSv4jD4Xa" crossorigin="anonymous">
    </script>
</body>

</html>