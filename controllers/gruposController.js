const Categorias = require('../models/Categorias.js');
const Grupos = require('../models/Grupos.js');
const shortid = require('shortid');
const multer = require('multer');
const fs = require('fs');

const configuracionMulter = {
    limits: { fileSize: 1 * 1024 * 1024 }, // 1 MB
    storage: fileStorage = multer.diskStorage({
        destination: (req, file, next) => {
            next(null, __dirname+'/../public/uploads/grupos/');
        },
        filename: (req, file, next) => {
            const extension = file.mimetype.split('/')[1];
            next(null, `${shortid.generate()}.${extension}`);
        }
    }),
    fileFilter(req, file, next) {
        if(file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
            // El formato es valido
            next(null, true);
        }
        else {
            // El formato no es valido
            next(new Error('Formato no valido'), false);
        }
    }
}
const upload = multer(configuracionMulter).single('imagen');

exports.subirImagen = (req, res, next) => {
    upload(req, res, function(error) {
        if(error) {
            if(error instanceof multer.MulterError) {
                if(error.code === 'LIMIT_FILE_SIZE') {
                    req.flash('error', 'El archivo es muy grande')
                } else {
                    req.flash('error', error.message);    
            }
            } else if(error.hasOwnProperty('message')){
                req.flash('error', error.message);
            }
            res.redirect('back');
            return;
        }
        else {
            next();
        }
    })
}

exports.formsNuevoGrupo = async(req, res) => {
    const categorias = await Categorias.findAll();

    res.render('nuevo-grupo', {
        nombrePagina: 'Crea un nuevo grupo',
        categorias
    })
}

// Almacena los grupos en la BD
exports.crearGrupo = async (req, res) => {

    const grupo = req.body;

    // Relaciona usuarioId
    grupo.usuarioId = req.user.id;

    // Leer la imagen
    if(req.file) {
        grupo.imagen = req.file.filename;
    }

    try {
        // almacenar en la bD
        await Grupos.create(grupo);
        req.flash('exito', 'Se ha creado el Grupo Correctamente');
        res.redirect('/administracion');
    } catch (error) {
        // extraer el message de los errores
        const erroresSequelize = error.errors.map(err => err.message);
        req.flash('error', erroresSequelize);
        res.redirect('/nuevo-grupo');
    }
}

// Form Editar grupo
exports.formEditarGrupo = async(req, res) => {
    const consultas = [];
    consultas.push( Grupos.findByPk(req.params.grupoId) );
    consultas.push( Categorias.findAll() );

    // Promise con await
    const [grupo, categorias] = await Promise.all(consultas);

    res.render('editar-grupo', {
        nombrePagina: `Editar grupo: ${grupo.nombre}`,
        grupo,
        categorias
    })
}
// Guardar cambios Editar grupo
exports.editarGrupo = async(req, res) => {
    const grupo = await Grupos.findOne({ where: { id: req.params.grupoId, usuarioId: req.user.id } });

    // Si no hay grupos o no es el dueño
    if(!grupo) {
        req.flash('error', 'Operacion no valida');
        res.redirect('/iniciar-sesion');
        return next();
    }

    // Ok
    const { nombre, descripcion, categoriaId, url } = req.body;

    // Asignar los valores
    grupo.nombre = nombre;
    grupo.descripcion = descripcion;
    grupo.categoriaId = categoriaId;
    grupo.url = url;

    // Guardar los datos en la base de datos
    await grupo.save();
    req.flash('exito', 'Cambios actualizados');
    res.redirect('/administracion');
}

// Form editar imagen
exports.formEditarImagen = async(req, res) => {
    const grupo = await Grupos.findOne({ where: { id: req.params.grupoId, usuarioId: req.user.id } });

    res.render('imagen-grupo', {
        nombrePagina: `Editar imagen gupo: ${grupo.nombre}`,
        grupo
    })
}

// Modifica la imagen en la BD y elimina la anterior
exports.editarImagen = async(req, res) => {
    const grupo = await Grupos.findOne({ where: { id: req.params.grupoId, usuarioId: req.user.id } });
    
    // Si no hay grupos o no es el dueño
    if(!grupo) {
        req.flash('error', 'Operacion no valida');
            res.redirect('/iniciar-sesion');
            return next();
        }
        
        // Si hay imagen anterior y nueva
        if(req.file && grupo.imagen) {
        const imagenAnterirorPath = __dirname + `/../public/uploads/grupos/${grupo.imagen}`;
        
        // Eliminar archivo con filesystem
        fs.unlink(imagenAnterirorPath, (error) => {
            if(error) {
                console.log(error);
            }
            return;
        })
    }
    
    // Si hay imagen nueva la guardamos
    if(req.file) {
        grupo.imagen = req.file.filename;
    }
    
    // Guardar en la BD
    await grupo.save();
    req.flash('exito', 'Imagen actializada');
    res.redirect('/administracion');
    
}

// Form eliminar grupo
exports.formEliminarGrupo = async(req, res) => {
    const grupo = await Grupos.findOne({ where: { id: req.params.grupoId, usuarioId: req.user.id } });

    if(!grupo) {
        req.flash('error', 'Operacion no valida');
        res.redirect('/administracion');
        return next();
    }

    res.render('eliminar-grupo', {
        nombrePagina: `Eliminar grupo: ${grupo.nombre}`,
    })
}
// Eliminar grupo e imagen
exports.eliminarGrupo = async(req, res) => {
    const grupo = await Grupos.findOne({ where: { id: req.params.grupoId, usuarioId: req.user.id } });

    if(!grupo) {
        req.flash('error', 'Operacion no valida');
        res.redirect('/administracion');
        return next();
    }

    // Si hay imagen la elimina
    if(grupo.imagen) {
        const imagenAnterirorPath = __dirname + `/../public/uploads/grupos/${grupo.imagen}`;
        
        // Eliminar archivo con filesystem
        fs.unlink(imagenAnterirorPath, (error) => {
            if(error) {
                console.log(error);
            }
            return;
        })
    }

    // Eliminar el grupo
    await Grupos.destroy({
        where: {
            id: req.params.grupoId
        }
    });

    // Redireccionar y mensaje flash
    req.flash('exito', 'Grupo eliminado');
    res.redirect('/administracion');
}