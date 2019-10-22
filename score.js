#!/usr/bin/env node
const exec = require('child_process').exec;
const exesync = require('child_process').execSync;
const request = require('request');
var program = require('commander');
var HtmlParser = require('node-html-parser');
var co = require('co');
var prompt = require('co-prompt');
const scheduleUrl = "https://www.cricbuzz.com/cricket-series/2697/icc-cricket-world-cup-2019/matches"
program.option('-m, --match-id <matchId>', 'Match ID')
.action(()=>{
    if(program.matchId){
        startNotfication(program.matchId);
    }   
    else{
        var finalArray = [];
        request(scheduleUrl,(err,res,body)=>{
            if(err)
                console.log(err);
            else if(body){
                
                var html = (HtmlParser.parse(body));
                // console.log(html.querySelectorAll(".cb-col-60.cb-col.cb-srs-mtchs-tm"))
                var matches = html.querySelectorAll(".cb-col-60.cb-col.cb-srs-mtchs-tm")
                for (var i=matches.length-1;i>=0;i--){
                    var p = matches[i].querySelector('.text-hvr-underline')
                    if(p)
                    var value = p.rawAttributes.href.replace('/live-cricket-scores/','').split('/')[0];
                    if (p){
                     finalArray.push({
                         'match':matches[i].text,
                         'id':value
                     }) 
                    }
                }
                console.log('Please select the match')
                for(var i=0;i<10;i++){
                    console.log((i+1) +'. '+ finalArray[i].match);
                }
                co(function *() {
                    var matchId = yield prompt('match number: ');
                    if(finalArray[matchId-1]){
                        startNotfication(finalArray[matchId-1].id);
                    } 
                });
                // startNotfication(finalArray[47-1].id);
            }
        })
    }
})
.parse(process.argv);

var init = true;
var wrapperPreText = ["osascript -e '","'"];
var wrapperDisplayNotification = ['display notification "','" with ']
var wrapperTitle = ['title "','" ']
var wrapperSubTitle = ['subtitle "','"'] 


var bowlerId = 0;
var showToss = false;
var showOut = false;
var bt1 = 0;
var bt2 = 0;
var prevCom = '';

var getIndiaMatch = function(url){
    request(url,(err,req,body)=>{
        try{
            body = JSON.parse(body);
        }catch (e){
            return
        }
        if(err){

        }
        var comm_lines = body.comm_lines;
        if(body.state == 'mom' || body.state == 'complete'){
            sendNotification(body.status,'',body.state_title,'');
            clearInterval(gp);
        }
        else if (body.toss && !showToss){
            showToss = true;
            sendNotification('','',body.toss.winner + ' Won the Toss','Choose to '+body.toss.decision);
        }
        else if((comm_lines[0].evt == 'four' || comm_lines[0].evt == 'six') && comm_lines[0].o_no != prevCom){
                prevCom = comm_lines[0].o_no;
                var score = body.team1.id == body.score.batting.id ? body.team1.s_name : body.team2.s_name;
                score +=  ' '+ body.score.batting.score;
                sendNotification('',comm_lines[0].comm.replace('<b>','').replace('</b>','').replace('four','FOUR').replace('six','SIX'),comm_lines[0].evt.toUpperCase(),score);
        }
        else if(body.score){
            if(body.score.batsman.length > 1){
                showOut = false;
                var player1 = {};
                player1.id = body.score.batsman[0].id;
                bt1 = player1.id;
                player1.name = (body.players.filter(function(o){return o.id == player1.id}))[0].f_name;
                player1.score = body.score.batsman[0].r;
                player1.name += body.score.batsman[0].strike == 1 ? ' *' : '';
                player1.fn = player1.name + ' '+player1.score+' ('+body.score.batsman[0].b+')';
                var player2 = {};
                player2.id = body.score.batsman[1].id;
                bt2 = player2.id;
                player2.name = (body.players.filter(function(o){return o.id == player2.id}))[0].f_name;
                player2.score = body.score.batsman[1].r;
                player2.name += body.score.batsman[1].strike == 1 ? ' *' : '';
                player2.fn = player2.name + ' '+player2.score+' ('+body.score.batsman[1].b+')';
                var score = body.team1.id == body.score.batting.id ? body.team1.s_name : body.team2.s_name;
                score +=  ' '+ body.score.batting.score;
                if (body.score.bowler[0].id != bowlerId){
                    bowlerId = body.score.bowler[0].id;
                    sendNotification(player1.fn+'  |  ',player2.fn,score,body.status)
                }
            }
            else if(showOut== false){
                showOut = true
                if(body.score.batsman[0].id == bt1){
                    sendNotification('','','Wicket',(body.players.filter(function(o){return o.id == bt2}))[0].f_name+' is Out');
                }
                else{
                    sendNotification('','','Wicket',(body.players.filter(function(o){return o.id == bt1}))[0].f_name+' is Out');
                }
                bt1 =0;
                bt2 =0;
            }
        }else if(typeof(body.toss) == 'undefined' && typeof(body.score) == 'undefined' && init){
            init = false;
            sendNotification('','Once Match Started Notification will be sent','Match Not started','');
        }
        
    })
}

var sendNotification = function(player1,player2,score,status){
    exesync(wrapperPreText[0]+wrapperDisplayNotification[0]+status+wrapperDisplayNotification[1]+wrapperTitle[0]+score+wrapperTitle[1]+wrapperSubTitle[0]+player1+player2+wrapperSubTitle[1]+wrapperPreText[1]);
    setTimeout(() => {
        exesync(wrapperPreText[0]+wrapperDisplayNotification[0]+status+wrapperDisplayNotification[1]+wrapperTitle[0]+score+wrapperTitle[1]+wrapperSubTitle[0]+player1+player2+wrapperSubTitle[1]+wrapperPreText[1]);
    }, 3000);
}
// getIndiaMatch()
// var p = setInterval(function(){
//     getIndiaMatch()
// },10000)
var gp;
var startNotfication = function(id){
    const url = 'https://www.cricbuzz.com/match-api/'+id+'/commentary.json';
    getIndiaMatch(url)
     gp = setInterval(function(){
        getIndiaMatch(url)
    },10000)
}
