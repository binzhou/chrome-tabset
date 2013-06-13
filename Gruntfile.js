module.exports = function(grunt) {

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    clean: {
      build: "build",
      dist: "dist"
    },
    copy: {
      build: {
        files: [
          {
            expand: true,
            cwd: 'src/',
            src: ['options/*', 'popup/*', 'assets/img/*.png', 'assets/font/*'],
            dest: 'build/'
          }
        ]
      }
    },
    chromeManifest: {
      options: {
        buildnumber: true,
        background: "background.js"
      },
      build: {
        src: "src",
        dest: "build"
      }
    },
    useminPrepare: {
      html: ["src/options/options.html", "src/popup/popup.html"],
      options: {
        dest: "build/assets"
      }
    },
    usemin: {
      html: ["build/options/options.html", "build/popup/popup.html"],
      options: {
        dirs: ["build/assets"]
      }
    },
    crx: {
      dist: {
        "src": "build/",
        "dest": "dist/",
        "privateKey": "tabset.pem"
      }
    }
  });

  grunt.loadNpmTasks('grunt-chrome-manifest');
  grunt.loadNpmTasks('grunt-usemin');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-cssmin');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-crx');
  grunt.registerTask('build', ["clean:build", "copy:build", "chromeManifest:build", "useminPrepare", "concat", "uglify", "cssmin", "usemin"]);
  grunt.registerTask('dist', ["crx:dist"]);
};
