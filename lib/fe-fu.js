//Less part taken from : Joseph McCullough http://www.vertstudios.com/blog/less-app-windows-sorta/

var defaults = {
	"lessDir" : ".",
	"jsDir": ".",
	"watch" : true,
	"recursive" : false,
	"notify" : true
};

var	path = require('path'),
    fs = require('fs'),
    sys = require('sys'),
	os = require('os');

var isMac = os.type()=="Darwin";

var args = process.argv.slice(2);
if (args.length == 0){
	return showHelp();
}
var options = new Array();
while (args.length > 0) {
	var v = args.shift();
	if (v.indexOf("=") != 0){
		var splitted = v.split("=");
        options.push({ "key" : splitted[0], "value" : splitted[1] }); 
	}
	else if (v == "-h" || v == "--help" || v == "help")
			return showHelp();
}

options.forEach(function(opt){
	if (!opt.value || !opt.value.length){
		return;
	}
	defaults[opt.key] = getValue(opt.value);
});

//http://bit.ly/dKlPqQ (stack overflow) for package.json use
require.paths.unshift('./node_modules')

/* Dependencies */
var notifier = defaults.notify ? (isMac ? require('growl') : require('libnotify')) : { notify : function(){}};
var less = require('less');
var jsp = require("uglify-js").parser;
var pro = require("uglify-js").uglify;
var cleanCSS = require('clean-css');

readDir(defaults.lessDir, function (file) { return endsWith(file, ".less"); }, toCSS, defaults.recursive, defaults.watch, function(totalLess){
     if (totalLess == 0){
		Notify("Not watching any .less files..", true);
	 }
	 else {
			Notify("Watching " + totalLess + " .less files..");
	 }
	 
	 readDir(defaults.jsDir, function (file) { return endsWith(file, ".js"); }, toJS, defaults.recursive, defaults.watch, function(totalJS){
	    if (totalJS == 0){
			Notify("Not watching any .js files..", true);
		}
		else {
			Notify("Watching " + totalJS + " .js files..");
		}
		if (totalJS + totalLess == 0){
			Notify("Client Side Fu - no .less or .js files found...",true);
		}
		else {
			Notify("Client Side Fu - compiling & listening...");
		} 
	});
});


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
			var ast = jsp.parse(str); // parse code and get the initial AST
			ast = pro.ast_mangle(ast); // get a new AST with mangled names
			ast = pro.ast_squeeze(ast); // get an AST with compression optimizations
			var final_code = pro.gen_code(ast); // compressed code here
			var newFile = path.slice(0,-2) + "min.js";
			fs.writeFile(newFile, final_code, function(err)
			{
				if (err){
					Notify("error in WriteFile\n" + err, true);
				} else {
					Notify(newFile.substring(newFile.lastIndexOf("/") +1) + " successfully updated.");
				}
			}); 
        }
		catch (er)
		{
			return Notify(er, true);
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
                Notify(err, true);
            } else {
                try {
                    css = tree.toCSS({compress: true});
                    writeCSS(path, css);
                } catch (e) {
                    Notify(e, true);
                }
            }
        });
    });
}

function writeCSS(file,less){
	var minless = cleanCSS.process(less);
	var newFile = file.slice(0, -3) + "css";
	var newMinFile = file.slice(0, -3) + "min.css"; 
	fs.writeFile(newFile, less, function(err)
	{
			if (err){
				Notify("error in WriteFile\n" + err, true);
			} else {
				Notify(newFile + " successfully updated.");
			}
	}); 
	fs.writeFile(newMinFile, minless, function(err)
	{
			if (err){
				Notify("error in WriteFile\n" + err, true);
			} else {
				Notify(newMinFile + " successfully updated.");
			}
	}); 
}

function Notify(str, isError){
	var theTitle = 'Less : ' + (isError ? 'Error' : 'Info');
	sys.puts(isError ? stylize(str,'red') : str);
	notifier.notify(str, {title : theTitle});
}

// Stylize a string
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

function showHelp(){
	sys.puts("help and such");
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
                    readDir(abspath, function(err, data) {
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
	var getFiles = recursive ?readDirRecursive fs.readdir;
	getFiles(dir, function(err, files){
		if (err){
			Notify(err, true);
			return callback(0);
		}
		var filesCount = 0;
		files.forEach(function(file){
			if (!fileCondition(file))
				return;
			if (watch) {
				watchFile(file, doFcn);
			}
			doFcn(file);
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

function endsWith(str, what){
	return (str || "").indexOf(suffix, str.length - suffix.length) !== -1;
}
