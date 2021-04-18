Example App

1. Install XAMPP/WAMP server on your machine

2. Clone the 'example-app' repo in localhost folder.
    git clone https://github.com/nandakishor/example-app.git

3. Before to Start the server follow the next steps to setup database and GeoServer.

4. Downland and install Postgres DB

5. Run the below code to setup database and table,

    -- Database: example-app

    -- DROP DATABASE "example-app";

    CREATE DATABASE "example-app"
        WITH 
        OWNER = postgres
        ENCODING = 'UTF8'
        LC_COLLATE = 'English_India.1252'
        LC_CTYPE = 'English_India.1252'
        TABLESPACE = pg_default
        CONNECTION LIMIT = -1;

    -- Table: public.featuresDrawn

    -- DROP TABLE public."featuresDrawn";

    CREATE TABLE public."featuresDrawn"
    (
        type character varying(100) COLLATE pg_catalog."default" NOT NULL,
        name character varying(500) COLLATE pg_catalog."default",
        geom geometry,
        fid bigint NOT NULL DEFAULT nextval('"featuresDrawn_fid_seq"'::regclass),
        CONSTRAINT "featuresDrawn_pkey" PRIMARY KEY (fid)
    )

    TABLESPACE pg_default;

    ALTER TABLE public."featuresDrawn"
        OWNER to postgres;

6. Load the data from the dbstore.sql file

7. Download and install GeoServer 

8. Create a new Workspace with the name 'example_app'

9. Create a new Data store by selecting 'PostGIS' form Vector Data Sources category

10. Publish the layer.

11. Next navigate in browser to 'http://localhost/example-app/' to check the app.