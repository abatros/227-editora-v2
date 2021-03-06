const assert = require('assert')
const fs = require('fs')
const yaml = require('js-yaml');

const hb = require("handlebars");
const marked = require('marked');
const renderer = new marked.Renderer();

const path = require('path')

const s3 = require('./aws-s3.js')(); // already initialized.
const shortid = require('shortid');

const cheerio = require('cheerio');
const Massive = require('massive');
const monitor = require('pg-monitor');
const utils = require('./utils.js')
const shared_utils = require('/shared/utils.js')

const verbose =0;

;(verbose >0) && console.log('@33 ',{module})

async function compile_template(template_fn) {
  assert(template_fn.startsWith('s3://'))

  const {Bucket, Key} = parse_s3filename(template_fn)
//  's3://blueink/ya13/blueink-page-template-v4.html')
  const o1 = await s3.getObject({Bucket, Key});
  if (!o1.Body) {
    console.error(`@38 [${module.id}] failed to fetch template <${template_fn}>`,{o1})
    throw new Meteor.Error('template-not-found')
  }
  const template = o1.Body.toString('utf8')
  const compiled_template = hb.compile(template);
  console.log(`@42 template <${template_fn}> compiled`)
  return compiled_template
};

function md_fname(root,xid_) {
  return path.join(root,xid_,'index.md')
}


async function get_md_file_s3(md_fn) {
  // console.log(`@57 get_md_file_s3(${md_fn})`);

  const retv1 = await s3.getObject(md_fn) // => {err, Body, Bucket, Key}
  if (!retv1) {
    console.log(`@58 Unable to s3.getObject(${md_fn})`)
    return {error:`@58 Unable to s3.getObject(${md_fn})`}
  }
  if ((retv1.err)||(retv1.error)) {
    console.log(`@60 `,{retv1})
    throw retv1
  }
  assert (retv1.Body)
  const md_data = retv1.Body.toString('utf8')
  // console.log(`@62 body.length:${md_data.length}`)
  const v = md_data.split(/\-\-\-/)
  const meta = yaml.safeLoad(v[1]);
  const {Bucket,Key} = parse_s3filename(md_fn);
  ;(verbose >0) && console.log(`@71 `,{Bucket},{Key},{meta})
  return({meta, md:v[2],dir:Bucket,name:Key})
}


async function get_md_file({root,xid}) {

  if (root.startsWith('s3://')) {
    // ex: s3://blueink/ya14/1593-Y2U/1593-Y2U.index.md
    const md_fn = 's3://' + path.join(root.substring(5),xid,xid) + '.index.md';
    const retv1 = await get_md_file_s3(md_fn)
    ;(verbose >2) && console.log(`@78 `,{retv1})
    return retv1
  }

console.log(`@83 `,{root},{xid})

  const md_fn = path.join(root,xid,'index.md') // only thing specific to blueink....

  if (fs.existsSync(md_fn)) {
    const data = fs.readFileSync(md_fn, 'utf8')
    const v = data.split(/\-\-\-/)
    const meta = yaml.safeLoad(v[1]);
    const {dir,base,ext,name} = path.parse(path.normalize(md_fn))
    if (verbose) {
      console.log(`@63 get_md_file(${md_fn}) => dir:${dir}`)
    }
    return({meta, md:v[2],dir,name})
  }

  if (verbose) {
    console.log(`ALERT file-not-found get_md_file(${md_fn})`)
  }
  return {meta:null, md:null, dir:null, name:null}
} // get_md_file


/*
//const template_fn = '/home/dkz/2020/911-yellow/yellow-page-template-v1.html'
const template = fs.readFileSync(site.template_fn, 'utf8');
const compiled = hb.compile(template)
*/


const cache_template = {
  template_fn:null,
  compiled:null,
  VersionId:null,
}


function mk_html_compiled(p1) {
  const verbose =0;

  assert(typeof p1 !== 'string', 'Invalid parameters for mk-html')
  ;(verbose >0) && console.log({p1})

  const {
    md,
    Bucket, subsite, xid,
    compiled } = p1;
  let {meta} = p1;
  meta = meta || {};
  let html1 = md && marked(md, { renderer: renderer });
  meta.shortId = shortid.generate();
  html1 = html1
  //    .replace(/\\\-/g,'&ndash;') should be done before renderer...
      .replace(/\\rarr([\s\\])/g,'&rightarrow;$1')
      .replace(/\\[\s]+/g,'&ensp;')
  //    .replace(/\\[\-]{2,}/g,'&mdash;')

  const o = {
    Bucket,subsite, xid,
    meta, // for hsize
  }


  ;(verbose >0) && console.log(`@140 [${module.id}] mk_html_compiled o:`,o)

  Object.assign(o, {
    article: html1,
  })


  const html = compiled(o);

//  console.log(`@62 :`, {html})
  return Object.assign(p1,{html});
}

// --------------------------------------------------------------------------

async function mk_html(p1) {
  const verbose =0;

  assert(typeof p1 !== 'string', 'Invalid parameters for mk-html')
  ;(verbose >0) && console.log({p1})

  const {meta,
    md,
    Bucket,subsite, xid,
    template_fn,
    cache_disabled } = p1;

  assert(Bucket, '@154 Bucket is missing')
  assert(subsite, '@155 subsite is missing')
  assert(xid, '@156 xid is missing')

  assert(md, 'missing-md-code for mk-html')

  /*
  meta from MD-file may be absent.
  assert(meta, 'missing-meta for mk-html')
  */
  assert(template_fn, 'missing-template for mk-html')

  if (cache_disabled || (template_fn != cache_template.template_fn)||(! cache_template.compiled)) {
    cache_template.template_fn =null;
    cache_template.compiled =  await utils.compile_template(template_fn); // *******************************************
    cache_template.template_fn =template_fn;
  }

  ;(verbose >0) && console.log(`@137 `,{cache_template})


  Object.assign(p1,{
    compiled: cache_template.compiled
  })
  const html = mk_html_compiled(p1)
  ;(verbose >0) && console.log(`@175 html:`,{html})

  return html;
} // mk-html



async function write_html(cmd) {
  const {root, xid, meta, o_path, html, dryRun} = cmd;
  assert(html);
//  assert(root);
  assert(meta.xid);
  assert(o_path)

  const {Bucket, Key:Prefix} = parse_s3filename(o_path)

  //console.log({o_path},{Bucket},{Prefix})
///  throw '@208 TODO'

  if (Bucket) {
    //console.log(`TODO:`,{o_path})
//    throw '@208 TODO'
    const Key = path.join(Prefix, xid, 'index.html')
      console.log(`writing html  <s3://${Bucket}/${Key}>`)

    const retv = await s3.putObject({
      Bucket,
      Key,
      ACL: 'public-read',
      ContentType: 'text/html',
      ContentEncoding : 'utf8',
      Body: html,
      Tagging: "path=jpci&key2=value2",
      Metadata: {
        author: 'dkz',
        processor: '252-yellow-publish',
        date: new Date().toString(),
        shortid: meta.shortid
      }

    })


    return Object.assign(retv,{Bucket,Key,html});
  }


  const dir = absolute_path(o_path || root)
  const html_fn = path.join(dir, xid, 'index.html')

  console.log(`writing html on default path <${html_fn}>`)
  if (dryRun) {
      console.log(`    no writing because --dry-run option`)
  } else {
      fs.writeFileSync(html_fn, html,'utf8')
  }

}


function get_html_fn(batch_fn, xid) {
  if (batch_fn.startsWith('s3://')) {
    // ex: s3://blueink/ya14/1593-Y2U/1593-Y2U.index.md
    const fpath = 's3://' + path.join(batch_fn.substring(5),xid, 'index.html');
    return fpath
  }

  return path.join(batch_fn,xid,'index.md')
}


async function html2ts_vector({db, xid, html, dryRun}) {
  const verbose =0;
//  const {en,th,'meta.pdf':pdf, 'meta.img':img, meta} = scan_e3live_data(html)
  const retv1 = scan_e3live_data(html)
  console.log(`@233 `,{retv1})
  if (!retv1) {
    console.log(`@239 ALERT `,{html})
    return;
  }
  const {article, meta_tags} = retv1;
  if (article == undefined) {
    console.log(`@244 xid:<${xid}>\n`,{article},{meta_tags})
    throw 'break@245'
  }

  ;(verbose >0) && console.log(`@273 `,{meta_tags})
  ;(verbose >0) && console.log(`@274 `,{article})

  ;(xid != meta_tags.xid) && console.log(`ALERT meta_tags.xid:${meta_tags.xid} does not match.
    ANYWAY: meta_tags.xid is irrelevant
    `,{xid})

  const raw_text = article.split(/\r?\n/).join(' ').replace(/\s+/,' ')
  ;(verbose >0) && console.log({raw_text})

//  const xid = `${meta.xid}-${meta.sku}`; // blueink actual format.

  if (dryRun) {
    console.log(`DRY-RUN html2ts-vector raw_text.length:${raw_text.length}
      meta_tags.xid: ${meta_tags.xid}
      xid:${xid}
    `)
    return;
  }

  //meta.xid = xid; // no more need for xid alone.

  meta_tags.h1_html = `<div class="h1-deeps-item">
    <a href="https://abatros/yellow/${xid}/index.html"
      target="_blank" title="article : ${xid}">${meta_tags.h1}</a>
  </div>
  `

  const retv = await db.adoc.write_pagex('abatros.yellow', xid, pageNo=0,
        meta_tags, raw_text);
  return retv;
}

/********************************************

  extract <article>

  ALSO: extract h1 only to build index.

*********************************************/

function scan_e3live_data(html) {
  const verbose =0;
  const o ={};

  function add(k,v) {
    k = k.replace(/e3live\./,'')
    if (o[k] && o[k]!=v) {
      throw `ALERT-confusion o[${k}]:${o[k]}`
    }
    o[k] = v;
  }

  const $ = cheerio.load(html)
  const meta_tags = get_meta_tags($)
  console.log(`@292 `,{meta_tags})
  if (!meta_tags['xid']) {
    console.log(`ALERT e3live.xid is missing, skipping.`)
    console.log(`@291 `,{meta_tags})
    // the caller must fix that.
//    throw 'SHOULD DEFAULT TO xid_'
//    return null;
  }
//  console.log(`\n----------------------\n`,{meta_tags})

  // get H1
//  o.h1 = $('section#en h1').text();

  /*********************

  add <h1> to meta_tags -> for index.

  **********************/

  meta_tags.h1 = $('article.js-e3live h1').text();
  // could be copied into meta_tags

  const article = $('article#main').text()

  const o2 = {article, meta_tags}
  console.log(`@341: `,o2)
  return o2;
}


function get_meta_tags($) { // HEAD
  // return document.getElementsByTagName('meta').e3root.content;
////  const selector = `meta[name="${key}"]`
//  const meta = $('meta').attr('content');
  const o ={};
  function add(k,v) {
    k = k.replace(/^e3live\./,'')
    if (o[k] && o[k]!=v) {
      throw `ALERT-confusion o[${k}]:${o[k]}`
    }
    o[k] = v;
  }


  $('meta').each((j,it) =>{
    const name = $(it).attr('name');
    if (name) {
//      meta[name] = $(it).attr('content')
      //console.log(`-- meta[${name}]:"${meta[name]}"`)
      add(name, $(it).attr('content'))
    }
  })
  return o;
}

// --------------------------------------------------------------------------

// should use a template.

async function write_index(o_path, index) {
  const ul = index
  .map((it,j) =>{
//    const fname = it.Prefix.substring(5).replace('/index.html','');
    return `<div>${j} <a href="https://abatros.com/yellow/${it}/index.html">${it}</a></div>`
  }).join('\n')


  //  console.log({ul})
  const retv = await s3.putObject({
    Bucket: 'abatros',
  //    Key: 'ya11/index.htm',
    Key: 'yellow/index.html',
    Body: `<html>\n${ul}</html>`,
    ACL: 'public-read',
    ContentType: 'text/html',
    ContentEncoding : 'utf8',
  })

  console.log(`@391 write_index =>`,{retv})
}

function mk_index1({xid, html}) {
  const verbose =0;
//  const {en,th,'meta.pdf':pdf, 'meta.img':img, meta} = scan_e3live_data(html)

  const retv1 = scan_e3live_data(html)
  console.log(`@233 `,{retv1})
  if (!retv1) {
    console.log(`@239 ALERT `,{html})
    return;
  }
  const {article, meta_tags} = retv1;
  if (article == undefined) {
    console.log(`@244 xid:<${xid}>\n`,{article},{meta_tags})
    throw 'break@245'
  }

  ;(verbose >0) && console.log(`@273 `,{meta_tags})
  ;(verbose >0) && console.log(`@274 `,{article})

  ;(xid != meta_tags.xid) && console.log(`ALERT meta_tags.xid:${meta_tags.xid} does not match.
    ANYWAY: meta_tags.xid is irrelevant
    `,{xid})

  // get h1

  return {irow: `<div><a href="/yellow/${xid}/index.html">${xid}</a>${meta_tags.h1}</div>`};
}

// ----------------------------------------------------------------------------

function scan_e3live_data(html) {

  const $ = cheerio.load(html)
  const meta_tags = utils.get_meta_tags($)
//  console.log({head_meta})
  if (! meta_tags['xid']) {
    console.log(`ALERT e3live.xid is missing, skipping.`)
    console.error(`@465 [${module.id}] scan_e3live_data meta_tags (head):`,meta_tags)
//    return {};
  }
  // console.log(`@158 html.length:${html.length}`,{meta_tags})
  // get H1
//  o.h1 = $('section#en h1').text();
  const article = $('article#main').text();
  const h1 = $('article#main h1').text();

  meta_tags.h1 = h1; // not pure meta-tag

  const raw_text = article.split(/\r?\n/).join(' ').replace(/\s+/,' ')
  return {meta_tags, raw_text};
}


// ---------------------------------------------------------------------------


function deeps_headline_v1({url,xid,title}) {
        // this might need custom_hooks.
  return `<div class="h1-deeps-item">
      <a href="${url}"
        target="_blank"
        title="article : ${xid}">${title}</a>
    </div>
    `;
}

function deeps_headline({url,title, meta, meta_tags, s3_url:s3fn, path}) {

  const s3fn_ = (s3fn.startsWith('s3://')) ? s3fn.substring(5): s3fn;
  const {Bucket, subsite, xid} = shared_utils.extract_xid2(s3fn)

  return `<div class="h1-deeps-item">
      <a href="https://${Bucket}.com/${subsite}/${xid}"
        target="_blank"
        title="article : ${xid}">${title}</a>
        &ensp;
        &mdash;
        &ensp;
        <a target="_blank" href="editora.us/edit?s3=${s3fn_}"> [edit] </a>
        &emsp;
        [${path}]
    </div>
    `;
}



// --------------------------------------------------------------------------


module.exports = {
  moduleId: module.id, //'yellow-book-v2.js',
  compile_template,
  scan_e3live_data,
//  commit_ts_vector,
  mk_html,
  get_md_file,
  write_html,
  get_html_fn,
  html2ts_vector,
  template_fn: 's3://abatros/yellow/yellow-page-template-v1.html',
  mk_index1, write_index,
  deeps_headline
}
