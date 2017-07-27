let express = require('express');
let request = require('request');

let app = express();

let duper = {duper: 'hey'};

// Static Files
app.use('/angular', express.static(__dirname + '/angular'));
app.use('/assets', express.static(__dirname + '/assets'));
app.use('/bower',  express.static(__dirname + '/bower_components'));
app.use('/npm',  express.static(__dirname + '/node_modules'));
app.use('/views',  express.static(__dirname + '/views'));

app.get('/', function (req, res ) {
  res.sendFile(__dirname + '/views/index.html', duper);
});

app.get('/getFormatos/', getFormatos);

// Will change in further implementation
let strCiclo = '1617';
let strPlan = '2';

let baseUrl = 'http://controlescolarmsys.edomex.gob.mx/';
let cookies = 'JSESSIONID="Y5nc-YQ+zPRryg0WF6VMNKKU.master:server66131"; cookiesession1=53C3C8C5YVA1UVC06L82HRJIPTN24B5A';

function getFormatos(req, res) {

  let promises = [];
  let grupos = [];

  for (let i = 1; i <= 6; i++) {
    promises.push(getGrupos(i));
  } 

  Promise.all(promises)
  .then(results => {
    console.log(results);
    for (let i = 1; i <= 6; i++) {
      grupos.push({grado: i, grupos: results[i - 1]});
    }
    res.send(grupos);

  })
  .catch(e => console.log(e));

}

function getGrupos(grado) {
  return new Promise(function (resolve, reject) {

    request.get({
      url: `${baseUrl}SIASEBasCE/consultaGrupos/?strCiclo=${strCiclo}&strPlan=${strPlan}&strGrado=${grado}`,
      contentType : "application/json",
      dataType : "JSON",
      headers: {'cookie': cookies}
    }, function successCallback(data, status, stuff){
      // console.log('*' * 1000);
      // console.log(status);
      try {
        let alumnosPromises = [];
        let options = JSON.parse(status.body).grupos.split('"');

        let groupId = options.filter((item, index) => index === 1 || index === 3);
        let grupos = options.filter((item, index) => index === 2 || index === 4)
                        .map((item, index) => {
                          return {id: groupId[index], verb: grado + item.substring(2, 1)}
                        });

        grupos.forEach((item, index) => {
          alumnosPromises.push(getAlumnos(item));
        });

        Promise.all(alumnosPromises)
        .then(results => {
          for (let i = 0; i <= 1; i++) {
            grupos[i].alumnos = results[i];
          }

          resolve(grupos);

        })
        .catch(e => {
          console.log(e);
          throw Error(e);
        });
      } catch (e) {
        console.log(e);
        resolve(e);
      };
      


    }, function errorCallback(error) {
      reject(JSON.stringify({'error': error}));
    });

  })
}

function getAlumnos(grupo) {
  return new Promise (function (resolve, reject) {
    request.get({
      url: `${baseUrl}SIASEBasCE/escuela/cargaAlumnosConsultaReporteEval/?strGrupo=${grupo.id}`,
      encoding: 'utf-8',
      headers: {'cookie': cookies}
      }, function successCallback(data, status, stuff){
        console.log(status.body);

        let alumnos = JSON.parse(status.body).alumnos;
        alumnos = alumnos.map(item => ({folio: `RE1517${item.strClave}`, 
                                        nombre: `${item.strApellidoPaterno.replace("�", "Ñ")} ${item.strApellidoMaterno ? item.strApellidoMaterno.replace("�", "Ñ") : ''} ${item.strNombre.replace("�", "Ñ")}`,
                                        sexo: item.sexo.itgClave}));
        resolve(alumnos);
      }, function errorCallback(error) {
        reject(JSON.stringify({'error': error}));
      });
  });

}

app.listen('3000');