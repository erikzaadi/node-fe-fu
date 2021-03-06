//Less part taken from : Joseph McCullough http://www.vertstudios.com/blog/less-app-windows-sorta/

var defaults = {
	"lessDir" : ".",
	"jsDir": ".",
	"watch" : true,
	"recursive" : false,
	"notify" : true,
	"errorsOnly" : true,
	"jsLint" : true
};

var version = "0.1.9";

var icons = {
		success : 'thumbsup',
		error : 'cross',
		watching : 'marker',
		info : 'speach_bubble',
		getIcon : function(icon){
			return __dirname + "/../images/" + icon + ".png";
		}
}

var	path = require('path'),
    fs = require('fs'),
    sys = require('sys'),
	os = require('os');

var isMac = os.type()=="Darwin";

//http://bit.ly/dKlPqQ (stack overflow) for package.json use
require.paths.unshift('./node_modules')

var noop =  function(){ };

/* Dependencies */
var notifier =  {  notify : noop };
var less = require('less');
var jsp = require("uglify-js").parser;
var pro = require("uglify-js").uglify;
var cleanCSS = require('clean-css');
var jsLint = noop;

function getValue(val){
	switch (val) {
		case "true" : return true;
		case "false" : return false;
			default : return val;
	}
}

function toJS(path){
	var bareFilename = getFileName(path);
	fs.readFile(path, 'utf-8', function (e, str) {
		if (e) { 
			return Notify(e, true); 
		}
		try {
			if (defaults.jsLint && jsLintContent(str, bareFilename))
				return;
			var ast = jsp.parse(str); // parse code and get the iitlnitial AST
			ast = pro.ast_mangle(ast); // get a new AST with mangled names
			ast = pro.ast_squeeze(ast); // get an AST with compression optimizations
			var final_code = pro.gen_code(ast); // compressed code here
			var newFile = path.slice(0,-2) + "min.js";
			fs.writeFile(newFile, final_code, function(err)
			{
				if (err){
					Notify("Error in writing file : " + bareFilename + "\n" + err, true);
				} else {
					Notify(getFileName(newFile) + " successfully updated.", false, icons.success);
				}
			}); 
        }
		catch (er)
		{
			var message ="Error compiling javascript file: " + bareFilename + "\n" + er.message + " (line: " + er.line + ", col: " + er.col + ", pos: " + er.pos + ")" 
			return Notify(message, true);
		}
   });
}

function jsLintContent(str, fileName){
	var isOk = jsLint.check(str);
	if (isOk){
		return false;
	}

	var message = new Array();
	var errors = jsLint.check.errors;
	var isCritical = jsLint.check.errors[jsLint.check.errors.length -1] == null;
	if (isCritical){
		errors.pop();
		if (errors[errors.length -1].reason.match(/Stopping\.\s\s\(\d{0,2}\%\sscanned\)\./g)){
			errors.pop();
		}
	}
    message.push('\nJSLint found ' + errors.length + ' error' + (errors.length > 1 ? 's' : ''));
	message.push(' in ' + fileName + (isCritical ? ' (Critical)\n' :  '\n'));
	for (var err in errors){
		var curr = errors[err];
		message.push('Error ' + (parseInt(err) + 1) + ' (Line: ' + curr.line + ', Char: ' + curr.character + '):\n');
		message.push('Reason : ' + curr.reason + '\n');
		if (curr.evidence) {
			message.push('Evidence : ' + curr.evidence + '\n');
		}
		if (curr.raw){
			var raw = curr.raw;
			var details = [{'letter' : 'a', 'val' :curr.a}, 
							{ 'letter' : 'b', 'val' : curr.b},
							{ 'letter' : 'c', 'val' : curr.c},
							{ 'letter' : 'd', 'val' : curr.d}
							];
			for (var det in details){
				if (details[det].val){
					raw = raw.replace("{" + details[det].letter + "}", details[det].val);
				}
			}
			if (raw != curr.reason){
				message.push('Raw: ' + raw);
			}
		}
		message.push('\n');
	}
	Notify(message.join(''), true);
	message = null;
	return isCritical;
}

function toCSS(path) {
    var tree, css;
	var bareFilename = getFileName(path);
    fs.readFile(path, 'utf-8', function (e, str) {
        if (e) { return Notify(e, true) }
        new(less.Parser)({
            paths: [require('path').dirname(path)],
            optimization: 0
        }).parse(str, function (err, tree) {
            if (err) {
				var message = "Error parsing less file: " + bareFilename + "\n"
					+ err.message + " line : " + err.line + " column : "
					+ err.column + " index : " +err.index
					+ "\n" + err.extract;
                Notify(message, true);
            } else {
                try {
                    css = tree.toCSS({compress: true});
                    writeCSS(path, css);
                } catch (errParsing) {
					var message = "Error converting less file: " + bareFilename + " to css\n"
						+ errParsing.message + " line : " + errParsing.line + " column : "
						+ errParsing.column + " index : " +errParsing.index
						+ "\n" + errParsing.extract;
					return Notify(message, true);
				}     
                writeCSS(path, css);
			}
        });
    });
}

function writeCSS(file,less){
	try { 
	var minless = cleanCSS.process(less);
	}
	catch (er) 
	{
		return Notify("Error compressing css from file " + getFileName(file) + " : " + er, true);
	}
	var newFile = file.slice(0, -4) + "css";
	var newMinFile = file.slice(0, -4) + "min.css"; 
	fs.writeFile(newFile, less, function(err)
	{
			if (err){
				Notify("error in writing css file: " + getFileName(file) + "\n" + err, true);
			} else {
				Notify(getFileName(newFile) + " successfully updated.", false, icons.success);
			}
	}); 
	fs.writeFile(newMinFile, minless, function(err)
	{
			if (err){
				Notify("error in writing minified css file: " + getFileName(newMinFile) + "\n" + err, true);
			} else {
				Notify(getFileName(newMinFile) + " successfully updated.", false, icons.success);
			}
	}); 
}

function Notify(str, isError, icon, forceEvenIfNotError){
	if (!forceEvenIfNotError && defaults.errorsOnly && !isError)
		return;
	var theTitle = 'Frontend Fu : ' + (isError ? 'Error' : 'Info');
	var theImage = icons.getIcon(icon || (isError ? icons.error : icons.info));
	var theMessage = new Date().toLocaleTimeString() + " : " + str;
	sys.puts(isError ? stylize(str,'red') : theMessage);
	notifier.notify(theMessage, {title : theTitle, image : theImage});
}

function stylize(str, style) {
    var styles = {
        'bold'      : [1,  22],
        'inverse'   : [7,  27],
        'underline' : [4,  24],
        'yellow'    : [33, 39],
        'green'     : [32, 39],
        'red'       : [31, 39]
    };
    return '\033[' + styles[style][0] + 'm' + str +
           '\033[' + styles[style][1] + 'm';
}

function valueWithout(str, what){
	return str.slice(what.length + 1); 
}

function showVersion(){
	sys.puts("Frontend Fu version " + version);
	sys.puts("");
}

function showHelp(){
	showVersion();
	sys.puts("Usage: fe-fu --parameter value");
	sys.puts("");
	sys.puts("Parameters :");
	sys.puts("");
	sys.puts("	jsDir : path to javascript files");
	sys.puts("				- defaults to current directory");
	sys.puts("	lessDir : path to .less files");
	sys.puts("				- defaults to current directory");
	sys.puts("	notify : use growl / notify notifications");
	sys.puts("				- defaults to true");
	sys.puts("				set to false if growl/notify is not installed");
	sys.puts("	recursive : do a recursive file search");
	sys.puts("				- defaults to false");
	sys.puts("	watch : watch .js/.less files for changes");
	sys.puts("				- defaults to true");
	sys.puts("	errorsOnly : Notify only on errors");
	sys.puts("				- defaults to true");
	sys.puts("	");
}

//https://gist.github.com/825583
function readDirRecursive(start, callback) {
    // Use lstat to resolve symlink if we are passed a symlink
    fs.lstat(start, function(err, stat) {
        if(err) {
            return callback(err);
        }
        var found = {dirs: [], files: []},
            total = 0,
            processed = 0;
        function isDir(abspath) {
            fs.stat(abspath, function(err, stat) {
                if(stat.isDirectory()) {
                    found.dirs.push(abspath);
                    // If we found a directory, recurse!
                    readDirRecursive(abspath, function(err, data) {
                        found.dirs = found.dirs.concat(data.dirs);
                        found.files = found.files.concat(data.files);
                        if(++processed == total) {
                            callback(null, found);
                        }
                    });
                } else {
                    found.files.push(abspath);
                    if(++processed == total) {
                        callback(null, found);
                    }
                }
            });
        }
        // Read through all the files in this directory
        if(stat.isDirectory()) {
            fs.readdir(start, function (err, files) {
                total = files.length;
                for(var x=0, l=files.length; x<l; x++) {
                    isDir(path.join(start, files[x]));
                }
            });
        } else {
            return callback(new Error("path: " + start + " is not a directory"));
        }
    });
}

function readDir(dir, fileCondition, doFcn, recursive, watch, callback){
	var getFiles = recursive ? readDirRecursive : fs.readdir;
	getFiles(dir, function(err, files){
		if (err){
			Notify(err, true);
			return callback(0);
		}
		var filesCount = 0;
		if (files.files) {
			files = files.files;
		}
		files.forEach(function(file){
			var filePath = recursive ? file : (ensureEndingWithSlash(dir) + file); 
			if (!fileCondition(filePath))
				return;
			if (watch) {
				watchFile(filePath, doFcn);
			}
			doFcn(filePath);
			++filesCount;
		});
		callback(filesCount);
	});
}

function readDirRegular(dir, callback){
	fs.readdir(dir, callback);
}

function watchFile(file, doFcn){
	fs.watchFile(file, { persistent: true, interval: 200}, function(curr,prev)
	{
		doFcn(file);
	});
}

function ensureEndingWithSlash(str){
	return endsWith(str, "/") ? str : (str + "/");
}

function endsWith(str, what){
	return (str || "").indexOf(what, str.length - what.length) !== -1;
}

function getFileName(path){
	return path.substring(path.lastIndexOf("/") + 1);
}

function startFeFuIng(options){
	initFeFu(options);
	readDir(defaults.lessDir, function (file) { return endsWith(file, ".less"); }, toCSS, defaults.recursive, defaults.watch, function(totalLess){
	     if (totalLess == 0){
			Notify("Not watching any .less files..", true);
		}
		else {
			Notify("Watching " + totalLess + " .less files..", false, null, true);
		}
	 
		readDir(defaults.jsDir, function (file) { return endsWith(file, ".js") && !endsWith(file, ".min.js"); }, toJS, defaults.recursive, defaults.watch, function(totalJS){
			if (totalJS == 0){
				Notify("Not watching any .js files..", true);
			}
			else {
				Notify("Watching " + totalJS + " .js files..",false, null, true);
			}
			if (totalJS + totalLess == 0){
				Notify("Frontend Fu - no .less or .js files found...",true);
			}
			else {
				Notify("Frontend Fu - compiling & listening...", false, icons.watching, true);
			} 
		});
	});
}

function initFeFu(options){
	for (var key in options){
		var opt = options[key];
		defaults[key] = getValue(opt);
	}

	if (defaults.notify){
		notifier = isMac ? require('growl') : require('libnotify');
	}

	if (defaults.jsLint){
		jsLint = require('./jslint');
	}
}

/* -----[ Exports ]----- */

exports.startFeFu = startFeFuIng;
exports.defaults = defaults;
exports.showHelp = showHelp;
exports.showVersion = showVersion;
