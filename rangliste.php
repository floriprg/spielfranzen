<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Rangliste</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.2.0/dist/css/bootstrap.min.css" rel="stylesheet"
        integrity="sha384-gH2yIJqKdNHPEq0n4Mqa/HGKIhSkIHeL5AyhkYV8i59U5AR6csBvApHHNl/vI1Bx" crossorigin="anonymous">
</head>

<body>
    <h1 class="text-center">
        Rangliste
    </h1>
    <ul class="nav nav-tabs justify-content-center">
        <li class="nav-item">
            <button class="nav-link "
                onclick=" const params = new Proxy(new URLSearchParams(window.location.search), {get: (searchParams, prop) => searchParams.get(prop),});window.location ='index.php?to=' + params.to + '&s=' + params.s">Spielen</button>
        </li>
        <li class="nav-item">
            <button class="nav-link "
                onclick=" const params = new Proxy(new URLSearchParams(window.location.search), {get: (searchParams, prop) => searchParams.get(prop),});window.location ='login.php?to=' + params.to + '&s=' + params.s">Anmelden</button>
        </li>
        <li class="nav-item">
            <button class="nav-link"
                onclick=" const params = new Proxy(new URLSearchParams(window.location.search), {get: (searchParams, prop) => searchParams.get(prop),});window.location ='register.php?to=' + params.to + '&s=' + params.s">Registrieren</button>
        </li>
        <li class="nav-item active">
            <button class="nav-link">Rangliste</button>
        </li>
        <li class="nav-item">
            <button class="nav-link"
                onclick=" const params = new Proxy(new URLSearchParams(window.location.search), {get: (searchParams, prop) => searchParams.get(prop),});window.location ='game.php?to=' + params.to + '&s=' + params.s">Mein
                Spiel</button>
        </li>
    </ul>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.2.0/dist/js/bootstrap.bundle.min.js"
        integrity="sha384-A3rJD856KowSb7dwlZdYEkO39Gagi7vIsF0jrRAoQmDKKtQBHUuLZ9AsSv4jD4Xa" crossorigin="anonymous">
    </script>
</body>

</html>