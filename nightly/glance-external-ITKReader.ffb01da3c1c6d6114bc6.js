!function(e,r){if("object"==typeof exports&&"object"==typeof module)module.exports=r();else if("function"==typeof define&&define.amd)define([],r);else{var n=r();for(var t in n)("object"==typeof exports?exports:e)[t]=n[t]}}(self,(function(){return(self.webpackChunkglance=self.webpackChunkglance||[]).push([[3],{578:function(e,r,n){"use strict";n.r(r),n.d(r,{default:function(){return w},extensions:function(){return I},imageExtensions:function(){return k},polyDataExtensions:function(){return x},registerToGlance:function(){return R}});var t=n(517),a=n(518),o=n(438),i=n.n(o),s=n(671),f=n(249),c=n.n(f),u=n(519),l=(n(51),n(8)),d=n(80),m=n(520),y=d.Z.convertItkToVtkImage;function p(e,r){r.classHierarchy.push("vtkITKDicomImageReader"),e.readFileSeries=function(n){return n&&n.length&&n!==r.files?(r.files=n,(0,m.Z)(n).then((function(e){return e.image})).then((function(n){var t,a,o,i=y(n,{scalarArrayName:r.arrayName||(t=r.fileName,a=t.lastIndexOf("."),o=a>-1?t.substring(0,a):t,"Scalars ".concat(o))});r.output[0]=i,e.modified()}))):Promise.resolve()},e.requestData=function(){e.readFileSeries(r.files,r.fileName)}}var v={fileName:"",arrayName:null};function g(e,r){var n=arguments.length>2&&void 0!==arguments[2]?arguments[2]:{};Object.assign(r,v,n),l.ZP.obj(e,r),l.ZP.algo(e,r,0,1),l.ZP.setGet(e,r,["fileName","arrayName"]),p(e,r)}var h={newInstance:l.ZP.newInstance(g,"vtkITKDicomImageReader"),extend:g};t.ZP.setReadImageArrayBufferFromITK(s.Z),a.ZP.setReadPolyDataArrayBufferFromITK(u.Z);var N=new Set(Array.from(i().keys()).map((function(e){return e.toLowerCase()})));N.delete("json");var k=Array.from(N),x=Array.from(new Set(Array.from(c().keys()).map((function(e){return e.toLowerCase()})))),I=k.concat(x);function R(e){e&&(k.filter((function(e){return"dcm"!==e})).forEach((function(r){return e.registerReader({extension:r,name:"".concat(r.toUpperCase()," Reader"),vtkReader:t.ZP,binary:!0,fileNameMethod:"setFileName"})})),x.forEach((function(r){return e.registerReader({extension:r,name:"".concat(r.toUpperCase()," Reader"),vtkReader:a.ZP,binary:!0,fileNameMethod:"setFileName"})})),e.registerReader({extension:"dcm",name:"DICOM File Series Reader",vtkReader:h,fileNameMethod:"setFileName",fileSeriesMethod:"readFileSeries",binary:!0}))}var w={extensions:I,registerToGlance:R};R(("undefined"==typeof window?{}:window).Glance)},339:function(){}},function(e){return e.O(0,[1],(function(){return r=578,e(e.s=r);var r})),e.O()}])}));