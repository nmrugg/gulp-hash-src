# gulp-hash-src

<strong>DANGER: This is a 0.0.x release.</strong>

Automatically add cache busting hashes to links in HTML and CSS.

## Usage

```js
var gulp = require("gulp"),
    hash_src = require("gulp-hash-src");

gulp.task("hash", function() {
    return gulp.src(["./client/**/*.html", "./client/**/*.css"])
        .pipe(hash_src({build_dir: "./build", src_path: "./client"}))
        .pipe(gulp.dest("./build"))
});
```
Or added it to the pipe line:
```js
var gulp = require("gulp"),
    htmlmin = require("gulp-htmlmin"),
    hash_src = require("gulp-hash-src");

gulp.task("html", ["js", "css"], function ()
{
    return gulp.src("./client/**/*.html")
        .pipe(htmlmin())
        .pipe(hash_src({build_dir: "./build", src_path: "./client"}))
        .pipe(gulp.dest("./build"))
});
```

That will turn something like
```html
<script src="file.js">
```
into
```html
<script src="file.js?cbh=0123456789abcdef">
```
or
```css
html {
    background: url(image.jpg);
}
```
into
```css
html {
    background: url(image.jpg?cbh=0123456789abcdef);
}
```

## Options

```
build_dir   Where the files are that need to be hashed (required)

src_path    Where the files originated from (required)

hash        The type of hash (default: "md5")

enc         Encoding (default: "hex")

exts        The types of files to hash
            (default: [".js", ".css", ".jpg", ".jpeg", ".png", ".gif", ".svg", ".pdf", ".ico", ".ttf", ".woff"])

regex       The regular expression to find links
            (by default it looks for something like src="..." href="..." url(...)

analyze     The function to use to analyze the regular expression matches
            Must return an object like so
            {
                prefix: "href=",
                link:   "/file.js",
                suffix: ""
            }

query_name  The query string to add to the hash (default: "cbh")
            Turns links into href="file.css?cbh=0123456789abcdef"
            To remove the string entirely, give a blank string and get
            href="file.css?0123456789abcdef"
```

## License
<a href="http://nate.mit-license.org">MIT</a>
