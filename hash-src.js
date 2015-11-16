// jshint forin:true, noarg:true, noempty:true, eqeqeq:true, bitwise:true, onevar: true, strict:true, undef:true, unused:true, curly:true, node:true, newcap:true

"use strict";

var through = require("through2"),
    fs_helper = require("fs_helper"),
    girdle = require("girdle"),
    p,
    find_regex = /(href|src)\s*=\s*(?:(")([^"]*)|(')([^']*)|([^'"\s>]+))|url\s*\((?:(")([^"]+)|(')([^']+)|([^'"\)]+))/ig;

function match_all(regex, str)
{
    var match,
        pos = 0,
        res = [];
    
    /// If it has the global flag, it cannot return the elements in the parenthases, so we need to recreate it without it.
    if (regex.global) {
        /// We can get the flags at the end with toString() and then get rid of the "g".
        regex = new RegExp(regex.source, regex.toString().match(/\/([^\/]+)$/)[1].replace("g", ""));
    }
    
    /// Make sure to get all of the matching parenthases.
    while ((match = str.substr(pos).match(regex))) {
        res[res.length] = match;
        pos += match.index + (match[0].length || 1);
    }
    
    return res;
}

function clean_link(link, base)
{
    try {
        link = decodeURI(String(link));
    } catch (err) {
        // do nothing
    }
    
    /// Is it relative
    if (base && link[0] !== "/" && !is_abs_link(link)) {
        link = p.join(base, link);
    }
    
    return link;
}

function is_abs_link(link)
{
    return /^(?:mailto|data):|^(?:https?:)?\/\//i.test(link);
}

function analyze(match)
{
    var quote = match[2] || match[4] || match[7] || match[9] || "",
        link  = match[3] || match[5] || match[6];
    
    /// Is this a href/src match?
    if (link) {
        return {
            prefix: match[1] + "=" + quote,
            link: link,
            suffix: "", /// The last quote doesn't get matched
        };
    }
    
    /// It is a CSS match.
    return {
        prefix: "url(" + quote,
        link: match[8] || match[10] || match[11],
        suffix: "", /// The last quote doesn't get matched
    };
}

function destination_path(build_dir, link)
{
  return p.join(build_dir, link);
}

p = fs_helper.p;

module.exports = function hash_src(options)
{
    var hashes = {};
    
    if (!options || !options.build_dir) {
        throw new Error("Need build_dir");
    }
    
    if (!options.hash) {
        options.hash = "md5";
    }
    if (!options.enc) {
        options.enc = "hex";
    }
    if (!options.exts) {
        options.exts = [".js", ".css", ".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".pdf", ".ico", ".ttf", ".woff", ".mp3", ".ogg", ".ogv", ".mp4", ".webm", ".zip", ".tar", ".gz", ".bz2"];
    }
    if (!options.regex) {
        options.regex = find_regex;
    }
    if (!options.analyze) {
        options.analyze = analyze;
    }
    if (!options.destination_path) {
        options.destination_path = destination_path;
    }
    if (typeof options.query_name === "undefined") {
        options.query_name = "cbh"; /// "cache busting hash"
    }
    
    function get_hashes(data, base, cb)
    {
        var matches = match_all(options.regex, data);
        
        if (!matches) {
            return setImmediate(cb);
        }
        
        girdle.async_loop(matches, cb, function oneach(match, next)
        {
            var props = options.analyze(match);
            var link = clean_link(props.link, props.abs ? null : base),
                full_path;
            
            /// Have we already hashed this file, is the extention not whitelisted, or is it an absolute link (e.g., http://...)?
            /// If so, we don't need to hash it.
            if (hashes[link] || options.exts.indexOf(p.extname(link).toLowerCase()) === -1 || is_abs_link(link)) {
                return next();
            }
            
            
            full_path = options.destination_path(options.build_dir, link);
            fs_helper.fs.exists(full_path, function onres(exists)
            {
                if (!exists) {
                    if (options.verbose) {
                        console.log("[gulp-hash-src] WARNING: \"" + full_path + "\" does not exist. Cannot hash.");
                    }
                    return next();
                }
                fs_helper.is_dir(full_path, function onres(err, is_dir)
                {
                    if (is_dir) {
                        if (options.verbose) {
                            console.log("[gulp-hash-src] WARNING: \"" + full_path + "\" is a directory. Cannot hash.");
                        }
                        return next();
                    }
                    if (options.verbose) {
                        console.log("[gulp-hash-src] Hashing \"" + full_path + "\".");
                    }
                    fs_helper.hash(full_path, options.hash, options.enc, function onhash(hash)
                    {
                        if (options.hash_len) {
                            hash = hash.substr(0, options.hash_len);
                        }
                        hashes[link] = hash;
                        next();
                    });
                });
            });
        });
    }
    
    function rewrite(data, base)
    {
        return data.replace(options.regex, function add_hash()
        {
            var props = options.analyze(arguments),
                link;
            
            link = clean_link(props.link, props.abs ? null : base);
            
            if (hashes[link]) {
                return props.prefix + props.link + "?" + (options.query_name ? options.query_name + "=" : "") + hashes[link] + props.suffix;
            } else {
                return arguments[0];
            }
        });
    }
    
    function hash_it(file, encoding, callback)
    {
        var data = file.contents.toString(),
            base = p.relative(options.src_path, p.dirname(file.path));
        
        get_hashes(data, base, function onhash()
        {
            file.contents = new Buffer(rewrite(data, base));
            callback(null, file);
        });
    }
    
    return through.obj(hash_it);
};
