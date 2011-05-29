#Node.js Frontend Fu version 0.1.9
***
###Roadmap :
*  Unit tests

* Support combining files

* Separate less so that you can use node-fe-fu to only minify / combine css

* <del>Adding images (Info / Error)</del> **Done!**

* <del>add support for notifying only errors</del> **Done!**

*	Add more <del>options</del> modules
	1. pngcrushing
	2. [coffeescript](https://github.com/jashkenas/coffee-script)
	3. [html minification](https://github.com/kangax/html-minifier/)
	4. sprites
	5. <del>[JSLint](https://github.com/reid/node-jslint)</del> **Done!**

* Read from configuration file in addition to arguments

* Rewrite main fe-fu script to be more modular :

    modules.js => json with { name, parameters, file, condition }  
	moduleTypes => Validators, Compilers, Compressors, Aggregators
    each module => run(File), condition(file)
	define a pipeline that modules in a waterfall manner (coffee - js - jslint - uglify js)
