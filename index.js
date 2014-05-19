// jshint forin:true, noarg:true, noempty:true, eqeqeq:true, bitwise:true, onevar: true, strict:true, undef:true, unused:true, curly:true, node:true, newcap:true

"use strict";

var through = require("through2"),
    fs_helper = require("fs_helper"),
    girdle = require("girdle"),
    p = require("path"),
    
    //find_regex = /(src|href)\s*=([^>]+)/i,
    //find_regex = /(?:href|src)\s*=\s*(?:(["'])((?:\\\1|.)*)?\1|([^'"\s>]*))/i;
    //find_regex = /(?:href|src)\s*=\s*(["'])((?:\\\1|.)*)?\1/i;
    find_regex = /(href|src)\s*=\s*(?:(")([^"]*)|(')([^']*)|([^'"\s>]+))|url\s*\((?:(")([^"]+)|(')([^']+)|([^'"\)]+))/ig;
    //find_regex_g = /(href|src)\s*=\s*(?:(")([^"]*)|(')([^']*)|([^'"\s>]+))/ig;
    //find_regex_g;
    //quotes_regex = /(?:^['"]|['"]$)/g;

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
    link = decodeURI(String(link));
    
    /// Is it relative
    if (link[0] !== "/" && base && !is_abs_link(link)) {
        link = p.join(base, link)
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
        link = match[3] || match[5] || match[6];
    
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

module.exports = function hash_src(options)
{
    var hashes = {};
    
    if (!options || !options.build_dir) {
        throw "Need build_dir";
    }
    
    if (!options.hash) {
        options.hash = "md5";
    }
    if (!options.enc) {
        options.enc = "hex";
    }
    if (!options.exts) {
        options.exts = [".js", ".css", ".jpg", ".jpeg", ".png", ".gif", ".svg", ".pdf", ".ico", ".ttf", ".woff"];
    }
    if (!options.regex || !options.analyze) {
        options.regex = find_regex;
        options.analyze = analyze;
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
            //var link = clean_link(match[3] || match[5] || match[6], base),
            var link = clean_link(options.analyze(match).link, base),
                full_path;
            
            if (hashes[link] || options.exts.indexOf(p.extname(link).toLowerCase()) === -1 || is_abs_link(link)) {
                return next();
            }
            
            full_path = p.join(options.build_dir, link);
            
            fs_helper.fs.exists(full_path, function onres(exists)
            {
                if (!exists) {
                    return next();
                }
                fs_helper.is_dir(full_path, function onres(err, is_dir)
                {
                    if (is_dir) {
                        return next();
                    }
                    fs_helper.hash(full_path, options.hash, options.enc, function onhash(hash)
                    {
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
            //var link = clean_link(options.analyze(match).link, base),
            /*
            var orig_link = arguments[3] || arguments[5] || arguments[6],
                link,
                quote = arguments[2] || arguments[4] || "";
            */
            var props = options.analyze(arguments),
                link;
            
            link = clean_link(props.link, base)
            //console.log(link)
            //console.log(link, quote)
            //process.exit();
            if (hashes[link]) {
                //return arguments[1] + "=" + quote + orig_link + "?cbh=" + hashes[link] + quote
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
        /// file.contents = new Buffer(htmlmin.minify(String(file.contents), opts));
        //console.log(file.contents.toString());process.exit();
        get_hashes(data, base, function onhash(err)
        {
            file.contents = new Buffer(rewrite(data, base));
            callback(null, file);
        });
        ///file.contents = new Buffer(rewrite(file.contents.toString()));
        /*
        for (key in file) {
            console.log(key, file[key])
        }
        process.exit();
        console.log(file.path);
        console.log(encoding);
        console.log(callback);
        callback(null, file);
        */
        
        }
    
    return through.obj(hash_it);
};
