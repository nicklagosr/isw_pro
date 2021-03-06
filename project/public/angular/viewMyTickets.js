/**
 * Created by Anghelo on 01-05-2017.
 */

function reverseOnlyDate(fecha){
    return fecha.split("-").reverse().join("/");
}

function invertFecha(fecha){
    var separado = fecha.split(" ");
    //var separadito = separado[0].split("-").reverse().join("/");
    return reverseOnlyDate(separado[0]) + " " + separado[1];
}

function getTodayDate(){
    var today = new Date();
    var dd = today.getDate();
    var mm = today.getMonth()+1; //January is 0!
    var yyyy = today.getFullYear();

    if(dd<10) {
        dd='0'+dd;
    }

    if(mm<10) {
        mm='0'+mm;
    }

    //today = mm+'/'+dd+'/'+yyyy;
    today = yyyy+'-'+mm+'-'+dd;
    return today;
}

var app = angular.module('viewMyTickets', []);
app.controller('viewMyTicketsCtrl', function ($scope, $http){
    var userId = document.getElementById("userId").innerHTML;
    $http.get("/ticketCrud/readByUser/"+userId).then(function(response){
        var ticketsData = response.data;
        ticketsData.forEach(function(value){
            $http.get("/userCrud/read/"+value.propietario).then(function(response){
                value.propietario = response.data.username;
            });

            value.fecha_creacion = invertFecha(value.fecha_creacion);
            value.fecha_operacion = invertFecha(value.fecha_operacion).split(" ")[0];


            if(value.fecha_aplazado > getTodayDate()){
                value.aplazado = "Aplazado hasta " + reverseOnlyDate(value.fecha_aplazado)
            }
            else{
                value.aplazado = "OK";
            }
            if(value.eliminado === 1){
                value.aplazado = "Eliminado";
            }
        });
        $scope.ticketsData = ticketsData;
    });
});
