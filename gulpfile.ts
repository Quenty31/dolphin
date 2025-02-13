/**
 * Gulp tasks
 */

import * as fs from 'fs';
import * as gulp from 'gulp';
import * as ts from 'gulp-typescript';
const cssnano = require('gulp-cssnano');
import * as rimraf from 'rimraf';
import * as rename from 'gulp-rename';
const sass = require('gulp-sass');

const locales = require('./locales');

gulp.task('build:ts', () => {
	const tsProject = ts.createProject('./tsconfig.json');

	return tsProject
		.src()
		.pipe(tsProject())
		.on('error', () => {})
		.pipe(gulp.dest('./built/'));
});

gulp.task('build:copy:views', () =>
	gulp.src('./src/server/web/views/**/*').pipe(gulp.dest('./built/server/web/views'))
);

gulp.task('build:copy:locales', cb => {
	fs.mkdirSync('./built/client/assets/locales', { recursive: true });

	for (const [lang, locale] of Object.entries(locales)) {
		fs.writeFileSync(`./built/client/assets/locales/${lang}.json`, JSON.stringify(locale), 'utf-8');
	}

	cb();
});

gulp.task('build:copy', gulp.parallel('build:copy:views', 'build:copy:locales', () =>
	gulp.src([
		'./src/emojilist.json',
		'./src/server/web/views/**/*',
		'./src/**/assets/**/*',
		'!./src/client/assets/**/*'
	]).pipe(gulp.dest('./built/'))
));

gulp.task('clean', cb =>
	rimraf('./built', cb)
);

gulp.task('cleanall', gulp.parallel('clean', cb =>
	rimraf('./node_modules', cb)
));

gulp.task('build:client:styles', () =>
	gulp.src('./src/client/style.scss')
		.pipe(sass())
		.pipe((cssnano as any)())
		.pipe(gulp.dest('./built/client/assets/'))
);

gulp.task('copy:client', () =>
		gulp.src([
			'./assets/**/*',
			'./src/client/assets/**/*',
		])
			.pipe(rename(path => {
				path.dirname = path.dirname!.replace('assets', '.');
			}))
			.pipe(gulp.dest('./built/client/assets/'))
);

gulp.task('build:client', gulp.parallel(
	'build:client:styles',
	'copy:client'
));

gulp.task('build', gulp.parallel(
	'build:ts',
	'build:copy',
	'build:client',
));

gulp.task('default', gulp.task('build'));
