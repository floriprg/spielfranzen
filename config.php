<?php
define("JWT_SECRET", "gHfKxh%zjqC7ZMKAcY@B(fC(aC0Opv9Q");
define("JWT_ISSUER", "Florian Unterfrauner");
define("JWT_AUD", "http://localhost.com");
define("JWT_ALGO", "HS512");
function sql($sql)
{
    return pg_query(pg_connect("host=ec2-34-242-84-130.eu-west-1.compute.amazonaws.com port=5432 dbname=d2stjk7j24ibr user=ziekgdhkxuqkta password=c7029fdf0002ed1705c9fbf741c8a9dcf6fc3d4ca04f4c1957d7d7b3a1277543"), $sql);
}
?>