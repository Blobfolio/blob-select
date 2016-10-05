/*global module:false*/
module.exports = function(grunt) {

	//Project configuration.
	grunt.initConfig({
		//Metadata.
		pkg: grunt.file.readJSON('package.json'),

		//CSS
		sass: {
			dist: {
				options: {
					style: 'compressed'
				},
				files: {
					'css/blobselect.css': 'scss/blobselect.scss'
				}
			}
		},

		postcss: {
			options: {
				processors: [
					require('cssnano')()
				]
			},

			dist: {
				src: 'css/*.css'
			}
		},

		//JAVASCRIPT
		jshint: {
			all: ['js/blobselect.js']
		},

		uglify: {
			options: {
				mangle: false
			},
			my_target: {
				files: {
					'js/blobselect.min.js': ['js/blobselect.js']
				}
			}
		},

		//WATCH
		watch: {
			styles: {
				files: ['scss/*.scss', 'css/*.css'],
				tasks: ['css', 'notify:css'],
				options: {
					spawn: false
				},
			},

			scripts: {
				files: ['js/*.js'],
				tasks: ['javascript', 'notify:js'],
				options: {
					spawn: false
				},
			}
		},

		//NOTIFY
		notify: {
			css: {
				options:{
					title: "CSS Files built",
					message: "SASS and Post CSS task complete"
				}
			},

			js: {
				options: {
					title: "JS Files built",
					message: "Uglify and JSHint task complete"
				}
			}
		}
	});

	//These plugins provide necessary tasks.
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-contrib-watch');
	grunt.loadNpmTasks('grunt-contrib-sass');
	grunt.loadNpmTasks('grunt-postcss');
	grunt.loadNpmTasks('grunt-contrib-jshint');
	grunt.loadNpmTasks('grunt-notify');

	//tasks
	grunt.registerTask('default', ['css', 'javascript']);
	grunt.registerTask('css', ['sass', 'postcss']);
	grunt.registerTask('javascript', ['jshint', 'uglify']);

	grunt.event.on('watch', function(action, filepath, target) {
	  grunt.log.writeln(target + ': ' + filepath + ' has ' + action);
	});
};