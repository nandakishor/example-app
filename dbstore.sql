PGDMP                         y            example-app    13.2    13.2                0    0    ENCODING    ENCODING        SET client_encoding = 'UTF8';
                      false                       0    0 
   STDSTRINGS 
   STDSTRINGS     (   SET standard_conforming_strings = 'on';
                      false                       0    0 
   SEARCHPATH 
   SEARCHPATH     8   SELECT pg_catalog.set_config('search_path', '', false);
                      false                       1262    18946    example-app    DATABASE     i   CREATE DATABASE "example-app" WITH TEMPLATE = template0 ENCODING = 'UTF8' LOCALE = 'English_India.1252';
    DROP DATABASE "example-app";
                postgres    false            �            1259    19969    featuresDrawn    TABLE     �   CREATE TABLE public."featuresDrawn" (
    type character varying(100) NOT NULL,
    name character varying(500),
    geom public.geometry,
    fid bigint NOT NULL
);
 #   DROP TABLE public."featuresDrawn";
       public         heap    postgres    false            �            1259    19975    featuresDrawn_fid_seq    SEQUENCE     �   CREATE SEQUENCE public."featuresDrawn_fid_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 .   DROP SEQUENCE public."featuresDrawn_fid_seq";
       public          postgres    false    206                       0    0    featuresDrawn_fid_seq    SEQUENCE OWNED BY     S   ALTER SEQUENCE public."featuresDrawn_fid_seq" OWNED BY public."featuresDrawn".fid;
          public          postgres    false    207            u           2604    19977    featuresDrawn fid    DEFAULT     z   ALTER TABLE ONLY public."featuresDrawn" ALTER COLUMN fid SET DEFAULT nextval('public."featuresDrawn_fid_seq"'::regclass);
 B   ALTER TABLE public."featuresDrawn" ALTER COLUMN fid DROP DEFAULT;
       public          postgres    false    207    206            �          0    19969    featuresDrawn 
   TABLE DATA           @   COPY public."featuresDrawn" (type, name, geom, fid) FROM stdin;
    public          postgres    false    206   "                  0    0    featuresDrawn_fid_seq    SEQUENCE SET     F   SELECT pg_catalog.setval('public."featuresDrawn_fid_seq"', 46, true);
          public          postgres    false    207            w           2606    19979     featuresDrawn featuresDrawn_pkey 
   CONSTRAINT     c   ALTER TABLE ONLY public."featuresDrawn"
    ADD CONSTRAINT "featuresDrawn_pkey" PRIMARY KEY (fid);
 N   ALTER TABLE ONLY public."featuresDrawn" DROP CONSTRAINT "featuresDrawn_pkey";
       public            postgres    false    206            �   ^	  x��XM�]�]����$J����)�M�ݤ��`{ 'N��{4��'w�=f��?�ۿ<~����n?<����O�o�;r��b������ܤ�S˙]�^�9�Pfl��gʾ�5��W��0B��ZJ^٥U�¹�@�c�^`����3�8�0���8�(���j���i�X9Ʌ;�r���T����O�9f�/��մ�}>�i�gxv5� �_8��Ņf8�Mu��Å��JvsY|bbi�*7=��/���'�Y�O1��ƯEY]j�#U��D½�X��'�7J�����������,9���%��P����q~0|L��[��#��⡉i�K�����eb_㣹HI���/_=���4�`x��˘��K�����:A���~D�K&�j�ęrB�/��G����}9�?�@��/ݗ	�$g��^�$��W*#�����ч�ދ��Χ���RB�R���ꮃU��d.v-D���`=�Ϛ9���Ӆה����|�S�l��(\7q/\P��4��e�!�!�@v�_8���),򳮀BT��n�"�ϟ߿�y����mMЫ�SQh�\����,�2�iԚ�!�U�Wj�&F���Ʒ�(X�ר2�z��:$�P�fs�§tP��QO|�[è���lSf��)$���Z:[U^PkIH*�bò�a�&���e��{�v��Җ�v����K���\�^�5�RM�^�_*�4Th4��Rq������������5Ys��^ѷ磒]�H��c�Q��v�%�+���7ʯ���/����v�a�s3�H���X���5�nD5T�ȅ�z��0����U��[��Ѷ�	��pFK��r�p����'c�������53����Zz?�"��á(�Af�W����$�DC��E����I]��@	��~��vh8$���z�r��"GT�%D�>%<>.yQn�.ũ�� ц�1&R_W��桻�S�VAؖ��^~oT�Ĝ����,'�Eak��u�"��s@���Ƞd?QDjA�`��B�ƚc��<��Y�r�̑��ܜ3�'�>��C3��VS�\C��Ĕe8����7|�^riŘ��B����f�T_C�r�y������@QK2�����N�q���$�h��q]#��Ĥft|�5�O��'�yHF����?׷�|�T؍��[����F�53~y��[����垙0h_�������W��m�}25�t���њ�(��pK�7��GʆL��톣%��|�(h=��T�a��z��,H��ĴL�x.��I-N+�D����J�.��~���$�_��̃�0��i���p䊖��av�ꩉ�eA�̵��p4�BOmW���!4h=τ
�`x,�����z��WVɇ��#:�x9�)k$>�n�6h����h�����.3�;Y�1z��%����C����gmڣr��`ӽ�zY���l��d���8,)*��u�����**�ka�)iVH~;�Y�ƹ_�WH���$u�����ijlx_I�5�XV��,���a�\�?�j·�������Z�Չ�a��߫�[t����������w���O����?����������t3��`���tZ�#`�B۬6�B)���Ә�T��ИآʰE#O�3�Q#H�M3B�{
$�������+��}w�E҅
�A~�s���4aR�HQ�N�U�p~6LA�c�s�^��d���{����9k���c�~\U�di�1�"�Mí��E>�^@s�i��f7�=b�9�gB��Vh������-���>�����?���4	�m���q����o��q��(M0��\��@oH�Z+c�v����.�y.�~���,V���Hd=��6��������|Aa����r�Y�&U��p݅��$�.�	0�F`Ʊ�u�	�Q�AU�����6���a� �%j,�������i��4��z��օjwC3�V(ؗl�Gc�s�x�/.�w�70�V-��ٳ�v,@�1/�0[aT�z��[ܑA	�]��hAD�q�~p�p��;Yr�� �~eE�^�^�(r��7t��*3�XG�ʸw,��@j�sc�.Ȟ�pXwb�u�в�Eʍ}F��=�� ��2��!���R>��V�pU��"��=���[_'!~���s�<����Lѡ���L(��z��^�o1~�VZ�]���a��1������8	� �}5�|�VT>%'J�,4�G[��3��n�*�;��b�g�l^GG�5&�,�	#g��2�?��Y7�haq�r�F�k��\�f��H3SkOk��,�@䠲�#o������<<<��c_�     