const coffee = require('gulp-coffee');
const gulp = require('gulp');
const gutil = require('gulp-util');
const mocha = require('gulp-mocha');
const SRC_FILE_PATTERN = './lib/**/*.coffee';
const SPEC_FILE_PATTERN = './test/*.Spec.js';

/** Run unit tests */
gulp.task('test', function () {
    gulp.src('test/sample.Spec.js', {read: false})
        .pipe(mocha({ reporter: 'nyan' }));
});

/** Transpile coffe-script to es5 */
gulp.task('coffee', function() {
  gulp.src(SRC_FILE_PATTERN)
    .pipe(coffee({ bare: true }).on('error', gutil.log))
    .pipe(gulp.dest('./dist/'));
});

/**
 * Test driven development: watch src and test files.
 * Transpile to es5 and test on change
 */
gulp.task('watch', function () {
    gulp.watch([SRC_FILE_PATTERN, SPEC_FILE_PATTERN], ['coffee', 'test']);
});
