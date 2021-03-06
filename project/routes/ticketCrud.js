/**
 * Created by Anghelo on 28-04-2017.
 */

var express = require("express");
var router = express.Router();

var path = require("path");
var mkdirp = require('mkdirp');
var fs = require("fs");

var common = require("./common");
var tiposDeUsuario = common.tiposDeUsuario;

var ticketsModel = require("../models/tickets");
var notificationsModel = require("../models/notifications");
var usersModel = require("../models/users");

/* create ticket */
router.post('/create', function(req, res){
    common.verificateLogin(req, res, function(req, res){
        var username = req.session.userData.userName;
        var usertype = req.session.userData.usertype;
        if(usertype < 3){
            var datetime = new Date();
            var date = datetime.getUTCFullYear() + "-" + (datetime.getUTCMonth()+1) + "-" + datetime.getUTCDate() + " " + (datetime.getUTCHours() - 4)+":" + datetime.getUTCMinutes()+":" + datetime.getUTCSeconds();

            var userId = req.session.userData.userID;
            var fuente = req.body.fuente;
            var ip_origen = req.body.ip_origen;
            var ip_destino = req.body.ip_destino;
            var puerto = req.body.puerto;
            var protocolo = req.body.protocolo;
            var tipo = req.body.tipo;
            var intencionalidad = req.body.intencionalidad;
            var subarea = req.body.subarea;
            var sistema_seguridad = req.body.sistema_seguridad;
            var fecha_operacion = req.body.fecha_operacion;
            var vinculo =  req.body.vinculo;
            var comentarios = req.body.comentarios;
            var correo_origen = req.body.correo_origen;
            var correo_afectado = req.body.correo_afectado;

            req.checkBody('ip_origen', 'IP origen invalida').isIP();
            req.checkBody('ip_destino', 'IP destino invalida').isIP();
            req.checkBody('fecha_operacion', "Fecha de operacion invalida").isDate();
            req.checkBody('correo_origen', 'Correo origen invalido').isMail();
            req.checkBody('correo_afectado', 'Correo afectado invalido').isMail();


            // TODO: input verifications

            req.getValidationResult().then(function(result){
                if(!result.isEmpty()){
                    res.render("validationError", {title: tiposDeUsuario[usertype], username: username, usertype: req.session.userData.usertype, errores: result.array(), mensaje: "Error al crear el ticket"});
                    //console.log(util.inspect(result.array()));
                }
                else{
                    ticketsModel.createTicket(req, res, userId, date, fuente, ip_origen, ip_destino, puerto, protocolo, tipo, intencionalidad, subarea, sistema_seguridad, fecha_operacion, comentarios, correo_origen, correo_afectado, vinculo);
                    usersModel.allUsersByType(req, res, 1, function(notificadoId){
                        notificationsModel.addNotification(req, res, notificadoId, "Hay un ticket nuevo sin encargado.", userId, "/users/viewTickets/");
                    });
                    if (vinculo !== "") {
                      ticketsModel.getLastTicketsByUser(req, res, userId, vinculo);
                    }
                    else {
                      res.redirect("/users");

                    }
                }
            });

        }
        else{
            res.render('noPermissionsError', {title: 'No tienes permisos', username: username, accion: "Crear ticket", usertype: usertype});
        }
    });
});

router.get("/getLink/:vinculo", function(req, res){
    console.log(req.session.lastTicket);
    ticketsModel.updateVinculoTicket(req, res, req.session.lastTicket, req.params.vinculo);
    res.redirect("/users");
  }
);

/* view ticket */
router.get("/read", function(req, res){
    common.verificateLogin(req, res, function(req, res){
        var usertype = req.session.userData.usertype;
        if(usertype < 3){
            ticketsModel.sendAllTickets(req, res, usertype);
        }
        else{
            var username = req.session.userData.userName;
            res.render('noPermissionsError', {title: 'No tienes permisos', username: username, accion: "Crear ticket", usertype: usertype});
        }
    });
});

router.get("/read/:ticketId", function(req, res){
    common.verificateLogin(req, res, function(req, res){
        var usertype = req.session.userData.usertype;
        if(usertype < 3){
            ticketsModel.sendTicketById(req, res, req.params.ticketId);
        }
        else{
            var username = req.session.userData.userName;
            res.render('noPermissionsError', {title: 'No tienes permisos', username: username, accion: "Crear ticket", usertype: usertype});
        }
    });
});

// TODO: a new post in case of the change the link

router.post("/assign", function(req, res){
    common.verificateLogin(req, res, function(req, res){
        var usertype = req.session.userData.usertype;
        var userId = req.session.userData.userID;
        if(usertype < 3 && usertype > 0){
            var ticketId = req.body.ticketId;
            var operadorId = req.body.operadorId;
            ticketsModel.assignTicket(req, res, ticketId, operadorId);
            notificationsModel.addNotification(req, res, operadorId, "Te han asignado un ticket.", userId, "/users/viewTickets/"+ticketId);
        }
        else{
            var username = req.session.userData.userName;
            res.render('noPermissionsError', {title: 'No tienes permisos', username: username, accion: "Asignar ticket", usertype: usertype});
        }
    });
});


router.post("/delete", function(req, res){
    common.verificateLogin(req, res, function(req, res){
        var usertype = req.session.userData.usertype;
        var userId = req.session.userData.userID;
        if(usertype === 1){
            var ticketId = req.body.ticketId;
            var ticketReason = req.body.ticketReason;
            ticketsModel.deleteTicket(req, res, ticketId, userId, ticketReason);
            usersModel.allUsersByType(req, res, 2, function(jefeId){
                notificationsModel.addNotification(req, res, jefeId, "Un supervisor ha eliminado un ticket.", userId, "/users/viewTickets/"+ticketId);
            });
        }
        else{
            var username = req.session.userData.userName;
            res.render('noPermissionsError', {title: 'No tienes permisos', username: username, accion: "Eliminar ticket", usertype: usertype});
        }
    });
});

router.post("/changeDate", function(req, res){
    common.verificateLogin(req, res, function(req, res){
        var usertype = req.session.userData.usertype;
        if(usertype === 1){
            var newDate = req.body.newDate; // AGREGAR ESTE BOTON EN LAS VISTA
            req.checkBody('newDate', "Fecha ingresada es invalida").isDate();
            req.getValidationResult().then(function(result){
                if(!result.isEmpty()){
                    res.render("validationError", {title: tiposDeUsuario[usertype], username: username, usertype: req.session.userData.usertype, errores: result.array(), mensaje: "Error al aplazar el ticket"});
                    //console.log(util.inspect(result.array()));
                }
                else{
                    ticketsModel.changeDateTicket(req, res, req.body.ticketId, newDate);
                    res.redirect("/users/viewTickets");
                }
            });
        }
        else{
            var username = req.session.userData.userName;
            res.render('noPermissionsError', {title: 'No tienes permisos', username: username, accion: "Aplazar ticket", usertype: usertype});
        }
    });
});

router.post("/de-delete", function(req, res){
    common.verificateLogin(req, res, function(req, res){
        var usertype = req.session.userData.usertype;
        if(usertype === 2){
            ticketsModel.de_deleteTicket(req, res, req.body.ticketId);
            res.redirect("/users");
        }
        else{
            var username = req.session.userData.userName;
            res.render('noPermissionsError', {title: 'No tienes permisos', username: username, accion: "Des-eliminar ticket", usertype: usertype});

        }
    });
});

router.all("/", function(req, res){
    /* Si la direccion es localhost/ticketCrud/ se redirecciona a localhost/ */
    res.redirect('/');
});

router.get("/readByUser/:userId", function(req, res){
    common.verificateLogin(req, res, function(req, res){
        var usertype = req.session.userData.usertype;
        if(usertype === 0){
            console.log(req.params.userId);
            ticketsModel.sendTicketsByUser(req, res, req.params.userId);
        }
        else{
            var username = req.session.userData.userName;
            res.render('noPermissionsError', {title: 'No tienes permisos', username: username, accion: "Ver tus tickets asignados", usertype: usertype});
        }
    });
});


router.post("/update", function(req, res){
    common.verificateLogin(req, res, function(req, res){
        var userId = req.session.userData.userID;
        var usertype = req.session.userData.usertype;
        if(usertype === 1 || usertype === 2){
            var ticketId = req.body.ticketId;

            var fuente = req.body.fuente;
            var ip_origen = req.body.ip_origen;
            var ip_destino = req.body.ip_destino;
            var puerto = req.body.puerto;
            var protocolo = req.body.protocolo;
            var tipo = req.body.tipo;
            var intencionalidad = req.body.intencionalidad;
            var subarea = req.body.subarea;
            var sistema_seguridad = req.body.sistema_seguridad;
            var fecha_operacion = req.body.fecha_operacion;
            var comentarios = req.body.comentarios;
            var correo_origen = req.body.correo_origen;
            var correo_afectado = req.body.correo_afectado;
            var vinculo = req.body.vinculo;

            req.checkBody('ip_origen', 'IP origen invalida').isIP();
            req.checkBody('ip_destino', 'IP destino invalida').isIP();
            req.checkBody('fecha_operacion', "Fecha de operacion invalida").isDate();
            req.checkBody('correo_origen', 'Correo origen invalido').isMail();
            req.checkBody('correo_afectado', 'Correo afectado invalido').isMail();

            req.getValidationResult().then(function(result){
                if(!result.isEmpty()){
                    res.render("validationError", {title: tiposDeUsuario[usertype], username: username, usertype: req.session.userData.usertype, errores: result.array(), mensaje: "Error al modificar el ticket"});
                    //console.log(util.inspect(result.array()));
                }
                else{
                    ticketsModel.updateTicket(req, res, ticketId, fuente, ip_origen, ip_destino, puerto, protocolo, tipo, intencionalidad, subarea, sistema_seguridad, fecha_operacion, comentarios, correo_origen, correo_afectado, vinculo);
                    ticketsModel.updateVinculoTicket(req, res, ticketId, vinculo);
                    usersModel.allUsersByType(req, res, 2, function(jefeId){
                        notificationsModel.addNotification(req, res, jefeId, "Un supervisor ha modificado un ticket.", userId, "/users/viewTickets/"+ticketId);
                    });
                    res.redirect("/users/viewTickets");
                }
            });


        }
        else{
            var username = req.session.userData.userName;
            res.render('noPermissionsError', {title: 'No tienes permisos', username: username, accion: "Modificar un ticket", usertype: usertype});
        }
    });
});

router.get("/readDelayed", function(req, res){
    common.verificateLogin(req, res, function(req, res){
        var usertype = req.session.userData.usertype;
        if(usertype < 3){
            ticketsModel.sendAllDelayedTickets(req, res, usertype);
        }
        else{
            var username = req.session.userData.userName;
            res.render('noPermissionsError', {title: 'No tienes permisos', username: username, accion: "Crear ticket", usertype: usertype});
        }
    });
});

router.get("/count/day/:year/:month", function(req, res){
    common.verificateLogin(req, res, function(req, res){
        var usertype = req.session.userData.usertype;
        if(usertype < 3){
            ticketsModel.sendTicketsAmountByDay(req, res, req.params.year, req.params.month);
        }
        else{
            var username = req.session.userData.userName;
            res.render('noPermissionsError', {title: 'No tienes permisos', username: username, accion: "Contar tickets por dia", usertype: usertype});
        }
    });
});

router.get("/count/week/:year", function(req, res){
    common.verificateLogin(req, res, function(req, res){
        var usertype = req.session.userData.usertype;
        if(usertype < 3){
            ticketsModel.sendTicketsAmmountByWeek(req, res, req.params.year);
        }
        else{
            var username = req.session.userData.userName;
            res.render('noPermissionsError', {title: 'No tienes permisos', username: username, accion: "Contar tickets por semana", usertype: usertype});
        }
    });
});

router.get("/count/month/:year", function(req, res){
    common.verificateLogin(req, res, function(req, res){
        var usertype = req.session.userData.usertype;
        if(usertype < 3){
            ticketsModel.sendTicketsAmmountByMonth(req, res, req.params.year);
        }
        else{
            var username = req.session.userData.userName;
            res.render('noPermissionsError', {title: 'No tienes permisos', username: username, accion: "Contar tickets por mes", usertype: usertype});
        }
    });
});

// AQUI PARTE

router.get("/count/trimestre/:year/tipo/:type", function(req, res){
    common.verificateLogin(req, res, function(req, res){
        var usertype = req.session.userData.usertype;
        if(usertype < 3){
            ticketsModel.sendTicketsAmmountByTrimestreType(req, res, req.params.year, req.params.type);
        }
        else{
            var username = req.session.userData.userName;
            res.render('noPermissionsError', {title: 'No tienes permisos', username: username, accion: "Contar tickets por trimestre", usertype: usertype});
        }
    });
});

router.get("/count/semestre/:year/tipo/:type", function(req, res){
    common.verificateLogin(req, res, function(req, res){
        var usertype = req.session.userData.usertype;
        if(usertype < 3){
            ticketsModel.sendTicketsAmmountBySemestreType(req, res, req.params.year, req.params.type);
        }
        else{
            var username = req.session.userData.userName;
            res.render('noPermissionsError', {title: 'No tienes permisos', username: username, accion: "Contar tickets por semestre", usertype: usertype});
        }
    });
});

router.get("/count/year/:year/tipo/:type", function(req, res){
    common.verificateLogin(req, res, function(req, res){
        var usertype = req.session.userData.usertype;
        if(usertype < 3){
            ticketsModel.sendTicketsAmmountByYearType(req, res, req.params.year, req.params.type);
        }
        else{
            var username = req.session.userData.userName;
            res.render('noPermissionsError', {title: 'No tienes permisos', username: username, accion: "Contar tickets por semestre", usertype: usertype});
        }
    });
});

router.get("/count/day/:year/:month/tipo/:type", function(req, res){
    common.verificateLogin(req, res, function(req, res){
        var usertype = req.session.userData.usertype;
        if(usertype < 3){
            ticketsModel.sendTicketsAmountByDayType(req, res, req.params.year, req.params.month, req.params.type);
        }
        else{
            var username = req.session.userData.userName;
            res.render('noPermissionsError', {title: 'No tienes permisos', username: username, accion: "Contar tickets por dia", usertype: usertype});
        }
    });
});

router.get("/count/week/:year/tipo/:type", function(req, res){
    common.verificateLogin(req, res, function(req, res){
        var usertype = req.session.userData.usertype;
        if(usertype < 3){
            ticketsModel.sendTicketsAmmountByWeekType(req, res, req.params.year, req.params.type);
        }
        else{
            var username = req.session.userData.userName;
            res.render('noPermissionsError', {title: 'No tienes permisos', username: username, accion: "Contar tickets por semana", usertype: usertype});
        }
    });
});

router.get("/count/month/:year/tipo/:type", function(req, res){
    common.verificateLogin(req, res, function(req, res){
        var usertype = req.session.userData.usertype;
        if(usertype < 3){
            ticketsModel.sendTicketsAmmountByMonthType(req, res, req.params.year, req.params.type);
        }
        else{
            var username = req.session.userData.userName;
            res.render('noPermissionsError', {title: 'No tienes permisos', username: username, accion: "Contar tickets por mes", usertype: usertype});
        }
    });
});



router.get("/count/trimestre/:year/uurr/:loc", function(req, res){
    common.verificateLogin(req, res, function(req, res){
        var usertype = req.session.userData.usertype;
        if(usertype < 3){
            ticketsModel.sendTicketsAmmountByTrimestre(req, res, req.params.year, req.params.loc);
        }
        else{
            var username = req.session.userData.userName;
            res.render('noPermissionsError', {title: 'No tienes permisos', username: username, accion: "Contar tickets por trimestre", usertype: usertype});
        }
    });
});

router.get("/count/semestre/:year/uurr/:loc", function(req, res){
    common.verificateLogin(req, res, function(req, res){
        var usertype = req.session.userData.usertype;
        if(usertype < 3){
            ticketsModel.sendTicketsAmmountBySemestre(req, res, req.params.year, req.params.loc);
        }
        else{
            var username = req.session.userData.userName;
            res.render('noPermissionsError', {title: 'No tienes permisos', username: username, accion: "Contar tickets por semestre", usertype: usertype});
        }
    });
});

router.get("/count/year/:year/uurr/:loc", function(req, res){
    common.verificateLogin(req, res, function(req, res){
        var usertype = req.session.userData.usertype;
        if(usertype < 3){
            ticketsModel.sendTicketsAmmountByYear(req, res, req.params.year, req.params.loc);
        }
        else{
            var username = req.session.userData.userName;
            res.render('noPermissionsError', {title: 'No tienes permisos', username: username, accion: "Contar tickets por semestre", usertype: usertype});
        }
    });
});

router.get("/count/day/:year/:month/uurr/:loc", function(req, res){
    common.verificateLogin(req, res, function(req, res){
        var usertype = req.session.userData.usertype;
        if(usertype < 3){
            ticketsModel.sendTicketsAmountByDay(req, res, req.params.year, req.params.month, req.params.loc);
        }
        else{
            var username = req.session.userData.userName;
            res.render('noPermissionsError', {title: 'No tienes permisos', username: username, accion: "Contar tickets por dia", usertype: usertype});
        }
    });
});

router.get("/count/week/:year/uurr/:loc", function(req, res){
    common.verificateLogin(req, res, function(req, res){
        var usertype = req.session.userData.usertype;
        if(usertype < 3){
            ticketsModel.sendTicketsAmmountByWeek(req, res, req.params.year, req.params.loc);
        }
        else{
            var username = req.session.userData.userName;
            res.render('noPermissionsError', {title: 'No tienes permisos', username: username, accion: "Contar tickets por semana", usertype: usertype});
        }
    });
});

router.get("/count/month/:year/uurr/:loc", function(req, res){
    common.verificateLogin(req, res, function(req, res){
        var usertype = req.session.userData.usertype;
        if(usertype < 3){
            ticketsModel.sendTicketsAmmountByMonth(req, res, req.params.year, req.params.loc);
        }
        else{
            var username = req.session.userData.userName;
            res.render('noPermissionsError', {title: 'No tienes permisos', username: username, accion: "Contar tickets por mes", usertype: usertype});
        }
    });
});



router.get("/count/trimestre/:year", function(req, res){
    common.verificateLogin(req, res, function(req, res){
        var usertype = req.session.userData.usertype;
        if(usertype < 3){
            ticketsModel.sendTicketsAmmountByTrimestre(req, res, req.params.year);
        }
        else{
            var username = req.session.userData.userName;
            res.render('noPermissionsError', {title: 'No tienes permisos', username: username, accion: "Contar tickets por trimestre", usertype: usertype});
        }
    });
});

router.get("/count/semestre/:year", function(req, res){
    common.verificateLogin(req, res, function(req, res){
        var usertype = req.session.userData.usertype;
        if(usertype < 3){
            ticketsModel.sendTicketsAmmountBySemestre(req, res, req.params.year);
        }
        else{
            var username = req.session.userData.userName;
            res.render('noPermissionsError', {title: 'No tienes permisos', username: username, accion: "Contar tickets por semestre", usertype: usertype});
        }
    });
});

router.get("/count/year/:year", function(req, res){
    common.verificateLogin(req, res, function(req, res){
        var usertype = req.session.userData.usertype;
        if(usertype < 3){
            ticketsModel.sendTicketsAmmountByYear(req, res, req.params.year);
        }
        else{
            var username = req.session.userData.userName;
            res.render('noPermissionsError', {title: 'No tienes permisos', username: username, accion: "Contar tickets por semestre", usertype: usertype});
        }
    });
});

// AQUI TERMINA LA WEA

router.post("/close", function(req, res){
    common.verificateLogin(req, res, function(req, res){
        var usertype = req.session.userData.usertype;
        var userId = req.session.userData.userID;
        if(usertype === 1 || usertype === 0 || usertype === 2){
            var ticketId = req.body.ticketId;
            var ticketReason = req.body.ticketDataClose;
            ticketsModel.closeTicket(req, res, ticketId, userId, ticketReason);
            usersModel.allUsersByType(req, res, 2, function(jefeId){
                notificationsModel.addNotification(req, res, jefeId, "Un usuario ha cerrado un ticket.", userId, "/users/viewTickets/"+ticketId);
            });
        }
        else{
            var username = req.session.userData.userName;
            res.render('noPermissionsError', {title: 'No tienes permisos', username: username, accion: "Cerrar ticket", usertype: usertype});
        }
    });
});

router.post("/re-open", function(req, res){
    common.verificateLogin(req, res, function(req, res){
        var usertype = req.session.userData.usertype;
        var userId = req.session.userData.userID;
        if(usertype === 2){
            var ticketId = req.body.ticketId;
            ticketsModel.reopenTicket(req, res, ticketId);
            usersModel.allUsersByType(req, res, 2, function(jefeId){
                notificationsModel.addNotification(req, res, jefeId, "Un jefe ha re-abierto un ticket.", userId, "/users/viewTickets/"+ticketId);
            });
        }
        else{
            var username = req.session.userData.userName;
            res.render('noPermissionsError', {title: 'No tienes permisos', username: username, accion: "Re abrir ticket", usertype: usertype});
        }
    });
});

router.all("*/stylesheets/:sheets", function(req, res){
    res.redirect("/stylesheets/" + req.params.sheets);
});
router.all("*/js/:js", function(req, res){
    res.redirect("/js/" + req.params.js);
});
router.all("*/angular/:angularjs", function(req, res){
    res.redirect("/angular/" + req.params.angularjs);
});
router.all("*/static/:static", function(req, res){
    res.redirect("/static/" + req.params.static);
});

module.exports = router;
