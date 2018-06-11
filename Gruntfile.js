/*global module:false*/
module.exports = function(grunt) {

	// Project configuration.
	grunt.initConfig({
		// Metadata.
		pkg: grunt.file.readJSON('package.json'),

		// CSS.
		sass: {
			dist: {
				options: {
					outputStyle: 'compressed',
					sourceMap: false,
				},
				files: {
					'dist/css/blobselect.css': 'src/scss/blobselect.scss',
					'dist/css/blobfolio.css': 'src/scss/blobfolio.scss',
					'dist/css/reset.css': 'src/scss/reset.scss'
				}
			}
		},
		postcss: {
			options: {
				map: false,
				processors: [
					require('postcss-fixes')(),
					require('autoprefixer')( { browsers: 'last 3 versions' } ), // vendor prefixes
					require('cssnano')({
						safe: true,
						calc: false,
						zindex : false
					})
				]
			},

			dist: {
				src: 'dist/css/*.css'
			}
		},

		// Javascript.
		eslint: {
			check: {
				src: ['src/js/**/*.js'],
			},
			fix: {
				options: {
					fix: true,
				},
				src: ['src/js/**/*.js'],
			}
		},
		uglify: {
			options: {
				mangle: false
			},
			my_target: {
				files: {
					'dist/js/blobselect.min.js': ['src/js/blobselect.js'],
				}
			}
		},

		// Watchers.
		watch: {
			styles: {
				files: ['src/scss/*.scss', 'dist/css/*.css'],
				tasks: ['css', 'notify:css'],
				options: {
					spawn: false
				},
			},

			scripts: {
				files: ['src/js/*.js'],
				tasks: ['javascript', 'notify:js'],
				options: {
					spawn: false
				},
			}
		},

		// Notifications.
		notify: {
			css: {
				options:{
					title: "CSS Done",
					message: "CSS has been linted, compiled, and minified."
				}
			},

			js: {
				options: {
					title: "Javascript Done",
					message: "JS has been linted, compiled, and minified."
				}
			}
		}
	});

	// These plugins provide necessary tasks.
	grunt.loadNpmTasks('grunt-contrib-uglify-es');
	grunt.loadNpmTasks('grunt-contrib-watch');
	grunt.loadNpmTasks('grunt-eslint');
	grunt.loadNpmTasks('grunt-notify');
	grunt.loadNpmTasks('grunt-postcss');
	grunt.loadNpmTasks('grunt-sass');

	// Tasks.
	grunt.registerTask('default', ['css', 'javascript']);
	grunt.registerTask('css', ['sass', 'postcss']);
	grunt.registerTask('javascript', ['eslint', 'uglify']);

	grunt.event.on('watch', function(action, filepath, target) {
	  grunt.log.writeln(target + ': ' + filepath + ' has ' + action);
	});
};
