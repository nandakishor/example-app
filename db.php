<?php

    $server = 'localhost';
    $username = 'postgres';
    $password = 'postgres';
    $db_name = 'example-app';

    $dbconn = pg_connect("host=$server port=5432 dbname=$db_name user=$username password=$password");
    
?>