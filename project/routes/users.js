var express = require('express');
var router = express.Router();
var common = require("./common");

/* GET users listing. */
router.get('/', function(req, res){
    common.verificateLogin(req, res, function(req, res){
        var username = req.session.userData.userName;
        var usertype = req.session.userData.usertype;

        if(usertype === 0){
            //res.send('hi ' + username + "<br> Operador");
            res.render('users0', {title: 'Operador', username: username});
        }
        else if(usertype === 1){
            //res.send('hi ' + username + "<br> Supervisor");
            res.render('users1', {title: 'Supervisor', username: username});
        }
        else if(usertype === 2){
            //res.send('hi ' + username + "<br> Jefe");
            res.render('users2', {title: 'Jefe', username: username});
        }
        else if(usertype === 3){
            //res.send('hi ' + username + "<br> Administrador");
            res.render('users3', {title: 'Administrador', username: username});
        }
    });
});

module.exports = router;
