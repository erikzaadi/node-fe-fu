//Less part taken from : Joseph McCullough http://www.vertstudios.com/blog/less-app-windows-sorta/

var defaults = {
	"lessDir" : ".",
	"jsDir": ".",
	"watch" : true,
	"recursive" : false,
	"notify" : true
};

var version = "0.1.7";

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

/* Dependencies */
var notifier =  {  notify : function(){ }};
var less = require('less');
var jsp = require("uglify-js").parser;
var pro = require("uglify-js").uglify;
var cleanCSS = require('clean-css');


function getValue(val){
	switch (val) {
		case "true" : return true;
		case "false" : return false;
			default : return val;
	}
}

function toJS(path){
	fs.readFile(path, 'utf-8', function (e, str) {
		if (e) { 
			return Notify(e, true); 
		}
		try {
			var ast = jsp.parse(str); // parse code and get the iitlnitial AST
			ast = pro.ast_mangle(ast); // get a new AST with mangled names
			ast = pro.ast_squeeze(ast); // get an AST with compression optimizations
			var final_code = pro.gen_code(ast); // compressed code here
			var newFile = path.slice(0,-2) + "min.js";
			fs.writeFile(newFile, final_code, function(err)
			{
				if (err){
					Notify("error in WriteFile\n" + err, true);
				} else {
					Notify(getFileName(newFile) + " successfully updated.", false, icons.success);
				}
			}); 
        }
		catch (er)
		{
			var message ="Error compiling javascript\n" + er.message + " (line: " + er.line + ", col: " + er.col + ", pos: " + er.pos + ")" 
			return Notify(message, true);
		}
   });
}

function toCSS(path) {
    var tree, css;
    fs.readFile(path, 'utf-8', function (e, str) {
        if (e) { return Notify(e, true) }
        new(less.Parser)({
            paths: [require('path').dirname(path)],
            optimization: 0
        }).parse(str, function (err, tree) {
            if (err) {
				var message = "Error parsing less \n"
					+ err.message + " line : " + err.line + " column : "
					+ err.column + " index : " +err.index
					+ "\n" + err.extract;
                Notify(message, true);
            } else {
                try {
                    css = tree.toCSS({compress: true});
                    writeCSS(path, css);
                } catch (errParsing) {
					var message = "Error converting less to css\n"
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
		return Notify("Error compressing css : " + er, true);
	}
	var newFile = file.slice(0, -4) + "css";
	var newMinFile = file.slice(0, -4) + "min.css"; 
	fs.writeFile(newFile, less, function(err)
	{
			if (err){
				Notify("error in WriteFile\n" + err, true);
			} else {
				Notify(getFileName(newFile) + " successfully updated.", false, icons.success);
			}
	}); 
	fs.writeFile(newMinFile, minless, function(err)
	{
			if (err){
				Notify("error in WriteFile\n" + err, true);
			} else {
				Notify(getFileName(newMinFile) + " successfully updated.", false, icons.success);
			}
	}); 
}

function Notify(str, isError, icon){
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
			Notify("Watching " + totalLess + " .less files..");
		}
	 
		readDir(defaults.jsDir, function (file) { return endsWith(file, ".js") && !endsWith(file, ".min.js"); }, toJS, defaults.recursive, defaults.watch, function(totalJS){
			if (totalJS == 0){
				Notify("Not watching any .js files..", true);
			}
			else {
				Notify("Watching " + totalJS + " .js files..");
			}
			if (totalJS + totalLess == 0){
				Notify("Frontend Fu - no .less or .js files found...",true);
			}
			else {
				Notify("Frontend Fu - compiling & listening...", false, icons.watching);
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
}

/* -----[ Exports ]----- */

exports.startFeFu = startFeFuIng;
exports.defaults = defaults;
exports.showHelp = showHelp;
exports.showVersion = showVersion;
