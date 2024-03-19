const express = require('express');
const fileUpload = require('express-fileupload');
const { MongoClient, Binary, ObjectId } = require('mongodb');
require('dotenv').config();

const app = express();
const port = 3001;

const uri = `mongodb+srv://${process.env.DBUSER}:${process.env.DBPASSWORD}@${process.env.DBHOSTNAME}/?retryWrites=true&w=majority`;
const client = new MongoClient(uri);

let database;
let collection;

app.use(fileUpload());

app.use(express.static(__dirname));
app.use('/assets', express.static('assets'));

app.get('/', (req, res) => {
    res.sendFile(__dirname + "/views/index.html");
});

app.post('/upload', async (req, res) => {
    try {
        if (!req.files || Object.keys(req.files).length === 0) {
            return res.status(400).send('No se enviaron archivos');
        }

        const data = {};
        data.content = new Binary(req.files.archivo.data);
        data.name = req.files.archivo.name;
        data.contentType = req.files.archivo.mimetype;
        data.size = req.files.archivo.size

        const result = await collection.insertOne(data);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error al subir el archivo');
    }
});

app.get('/download/:id', async (req, res) => {
    try {
        const id = req.params.id;

        const result = await collection.findOne({ _id: new ObjectId(id) });
        const bin = result.content;

        if (result.size) {
            res.setHeader('Content-Disposition', `attachment; filename="${result.name}"`);
            res.setHeader('Content-Type', result.contentType);
            res.send(bin.read(0, bin.length()));
        } else {
            res.json({
                message: "No hay archivos con ese Id"
            })
        }
    } catch (error) {
        console.error(error);
        res.status(500).send('Error al descargar el archivo');
    }
});

app.get('/documentos', async (req, res) => { //hace un findAll a la BD, retorna todo los documentos en JSON 
    try {
        const documentos = await collection.find({}).toArray();
        res.json({ documentos });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error al obtener los documentos');
    }
});

app.delete('/delete/:id', async (req,res) => { //hace un delete     
    try {
        const id = req.params.id; //jala la ID que escogio el cliente

        const result = await collection.deleteOne({ _id: new ObjectId(id) }); //hace el query de deleteOne({_id: id})

        if (result.deletedCount === 1) {
            res.status(200).json({ message: "Archivo eliminado correctamente" });
        }
    } catch (error) {
        console.error(error);
        res.status(500).send('Error al eliminar el archivo');
    }
})

app.listen(port, async () => {
    console.log(`Escuchando en el puerto ${port}`);
    try {
        await client.connect();
        database = client.db(process.env.DBNAME);
        collection = database.collection("archivos");
        console.log('Conexión a MongoDB establecida');
    } catch (error) {
        console.error('Error al conectar a MongoDB:', error);
    }
});

process.on('exit', () => {
    client.close();
});
