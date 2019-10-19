/**
 * Gulp tasks
 */

import * as fs from 'fs';
import * as gulp from 'gulp';
import * as gutil from 'gulp-util';
import * as ts from 'gulp-typescript';
import tslint from 'gulp-tslint';
const cssnano = require('gulp-cssnano');
import * as uglifyComposer from 'gulp-uglify/composer';
import * as rimraf from 'rimraf';
import chalk from 'chalk';
const imagemin = require('gulp-imagemin');
import * as rename from 'gulp-rename';
import * as mocha from 'gulp-mocha';
import * as replace from 'gulp-replace';
const uglifyes = require('uglify-es');
const sass = require('gulp-sass');

const locales = require('./locales');

const uglify = uglifyComposer(uglifyes, console);

const env = process.env.NODE_ENV || 'development';
const isProduction = env === 'production';
const isDebug = !isProduction;

if (isDebug) {
	console.warn(chalk.yellow.bold('WARNING! NODE_ENV is not "production".'));
	console.warn(chalk.yellow.bold('         built script will not be compressed.'));
}

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

gulp.task('lint', () =>
	gulp.src('./src/**/*.ts')
		.pipe(tslint({
			formatter: 'verbose'
		}))
		.pipe(tslint.report())
);

gulp.task('format', () =>
	gulp.src('./src/**/*.ts')
		.pipe(tslint({
			formatter: 'verbose',
			fix: true
		}))
		.pipe(tslint.report())
);

gulp.task('mocha', () =>
	gulp.src('./test/**/*.ts')
		.pipe(mocha({
			exit: true,
			require: 'ts-node/register'
		} as any))
);

gulp.task('test', gulp.task('mocha'));

gulp.task('clean', cb =>
	rimraf('./built', cb)
);

gulp.task('cleanall', gulp.parallel('clean', cb =>
	rimraf('./node_modules', cb)
));

gulp.task('build:client:script', () => {
	return gulp.src(['./src/client/boot.js'])
		.pipe(replace('ENV', JSON.stringify(env)))
		.pipe(replace('LANGS', JSON.stringify(Object.keys(locales))))
		.pipe(isProduction ? uglify({
			toplevel: true
		} as any) : gutil.noop())
		.pipe(gulp.dest('./built/client/assets/'));
});

gulp.task('build:client:styles', () =>
	gulp.src('./src/client/style.scss')
		.pipe(sass())
		.pipe(isProduction
			? (cssnano as any)()
			: gutil.noop())
		.pipe(gulp.dest('./built/client/assets/'))
);

gulp.task('copy:client', () =>
		gulp.src([
			'./assets/**/*',
			'./src/client/assets/**/*',
		])
			.pipe(isProduction ? (imagemin as any)() : gutil.noop())
			.pipe(rename(path => {
				path.dirname = path.dirname!.replace('assets', '.');
			}))
			.pipe(gulp.dest('./built/client/assets/'))
);

gulp.task('build:client', gulp.parallel(
	'build:client:script',
	'build:client:styles',
	'copy:client'
));

gulp.task('build', gulp.parallel(
	'build:ts',
	'build:copy',
	'build:client',
));

gulp.task('default', gulp.task('build'));
