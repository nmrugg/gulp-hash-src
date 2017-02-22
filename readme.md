# gulp-hash-src

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
<script src="file.js?v=0123456789abcdef">
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
    background: url(image.jpg?v=0123456789abcdef);
}
```

## Note

The files that are to be hash must be located in `build_dir` prior to running `hash_src()`.

## Options

```
build_dir   Where the files are that need to be hashed (required)

src_path    Where the files originated from (required)

hash        The type of hash (default: "md5")

hash_len    The length of the hash (default: null)
            If hash_len is falsey, the entire hash is used.

enc         Hash encoding (default: "hex")

exts        An array of the types of files to hash
            (default: [".js", ".css", ".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".pdf", ".ico", ".ttf", ".woff", ".mp3", ".ogg", ".ogv", ".mp4", ".webm", ".zip", ".tar", ".gz", ".bz2"])

rename      Renames the file rather than appending a querystring (default: false, recommended: true)

regex       The regular expression to find links
            (by default it looks for something like src="..." href="..." url(...)

analyze     The function to use to analyze the regular expression matches
            The function will receive an array of the matches from the regex.
            Must return an object like so:
            {
                prefix: "href=",
                link:   "/file.js",
                suffix: "",
                abs: false (optional)
            }

query_name  The query string to add to the hash (default: "v")
            Turns links into href="file.css?v=0123456789abcdef"
            To remove the string entirely, give a blank string and get
            href="file.css?0123456789abcdef"

verbose     Whether or not to log info about what is happening (default: false)
            Useful for debugging
```

## License
<a href="http://nate.mit-license.org">MIT</a>
