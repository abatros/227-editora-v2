const fs = require('fs')
const path = require('path')
const assert = require('assert');
const yaml = require('js-yaml')

import './edit-article.html'
import './edit-panel.js'
// import './preview-panel.js'
import './right-panel-header.js'
import './right-panel-preview.js'
import './right-panel-info.js'
import './right-panel-directory.js'
import './right-panel-deeps.js'


import utils from '/shared/utils.js'

const verbose =1;

const TP = Template.edit_article;

let etime = null;
const state = new ReactiveVar({q:'initial-state'})
const article_meta = new ReactiveVar({});

/*
      An article is associated with a MD file.
      In a web page, the article can be any tag with class="js-e3editora"
*/

import {s3parser} from '/shared/utils.js'




function commit_article(tp) {
  console.log(`@22 commit-article s3fpath:`, tp.s3fpath)
  //  console.log(`@206 commit-article meta:`, tp.meta)
  tp.set_status_light('status-busy')

  const xid = extract_xid(tp.s3fpath)

  assert(tp.s3fpath.startsWith('s3://'), `syntax error s3fpath <${s3fpath}>`)

  Meteor.call('commit-s3data', {
    s3fpath:tp.s3fpath, // full path for md-file, ex: s3://bueink/ya14/1102-Y3K2/index.md
    update:true,
    data:tp.cm.getValue()}, (err,data)=>{
      if (err) {
        tp.set_status_light('status-red')
        throw err; // do things on tp, according to results.
      }
      console.log(`@79 `,{data}) // here is the raw-file content
      //        const tab = window.open('http://localhost:8080/en/new-products/1466','http://localhost:8080/en/new-products/1466')


      if (data.error) {
        console.log(`@83 `, data.error)
        tp.set_status_light('status-red')
        Session.set('edit-message',data.err_msg)
        return;
      }



      tp.set_status_light('status-ok')
      Session.set('edit-message','commit Ok.')
    return;
    }

  )
}



TP.onCreated(function(){
  const etime_ = new Date().getTime();
  console.log(`@18: Meteor.connection `,Meteor.connection)
  /*
        async : get MD file associated with this article.
        wait onRendered to initialize codeMirror.
  */
  const tp = this;
  etime = new Date().getTime();
  // console.log(`@139 [${new Date().getTime()-etime}] Template.edit_article.onCreated.data:\n`,tp.data)

  //tp.data.save_article = tp.save_article;
  //console.log(`@33 done with Template.edit_article.onCreated [${new Date().getTime() - etime1} ms]`)
  Session.set('edit-message','loading...')
  Session.set('showing-right-panel',false)
})

TP.onRendered(function() {
  const tp = this;
  const etime_ = new Date().getTime();
return;
  const s3 = Session.get('s3'); // from router

  /********************
    protocol ????
  *********************/
  //const s3fpath = Session.get('s3fpath');
  const s3fpath = tp.data.s3fpath();
  Session.set('s3fpath',s3fpath) // after validation
  const flags = tp.data.flags();

  assert(s3fpath.startsWith('s3://'), `Syntax error s3path <${s3fpath}>`)

  const xid = Session.get('xid');
  ;(verbose) && console.log(`@74 edit_article.onRendered
    s3fpath:${s3fpath}
    `);

  // that is specific to blueink new-products.... NO-good

  function fix(fn) {
    // must be md-file
    const v = fn.split('/');
    const k = v.length;
    if (v[k-1].endsWith('.md')) v[k-1] = 'index.md' // fix blueink
    else v.push('index.md') // this allow missing name (implicit)
    return v.join('/')
  }

  //tp.s3fpath = (s3fpath)? 's3://'+s3fpath : `s3://${s3}/${xid}/${xid}.index.md` // blueink
  tp.s3fpath = s3fpath; // was fixed by router   fix(s3fpath)
  //  const s3fpath = 's3://blueink/ya14/1202-Y3K2/1202-Y3K2.index.md'
//    tp.s3fpath = s3fpath;

  //tp.cm = install_codeMirror(tp);

  const etime2 = new Date().getTime();

  const status_lights = tp.findAll('span.js-status-light')
  // console.log(`@93 `,{status_lights})

  tp.set_status_light = (x) =>{
    // console.log(`@311 `, {status_lights});
    status_lights.forEach(it=>{
      // console.log(`@312 `, it.attributes.color, {it});
      if (it.id == x) {
        it.style['background-color'] = it.attributes.color.value;
      } else {
        it.style['background-color'] = 'darkgray'
      }
//      console.log(it.style);
    })
  }

  tp.set_status_light('status-busy')

  // console.log(`@197 tp.s3fpath:${tp.s3fpath}`)


return;
get_s3Object(tp)

  console.log(`@40 done with Template.edit_article.onRendered [${new Date().getTime() - etime_} ms]`)
  return;

// ==========================================================================
  const conn = Meteor.connection;
  console.log({conn})
  ;(verbose>0) &&
    console.log(`@39: onRendered - Meteor.connection._lastSessionId: `,Meteor.connection._lastSessionId);
  ;(verbose>0) &&
    console.log(`[${new Date().getTime()-etime}] Template.edit_article.onRendered.data:`,tp.data)
  //const ai = FlowRouter.getParam('ai');

//  const xid = tp.data.xid();
  const _host = FlowRouter.getQueryParam('h');
  const host = _host; // || tp.data.host(); // from connection; WRONG
  const pathname = FlowRouter.getQueryParam('p');
  let md_fn;

  ;(verbose>0) &&
    console.log(`@51 host:${host} path:${pathname}`);

/*
  if (!host || !pathname) {
    console.log(`ALERT host or path are missing`)
    return;
  } */

  article_meta.set({host,pathname,xid})


//  console.log(`data:`,tp.data);
//  console.log(`data.article_id:`,tp.data.ai());
//  console.log(`data.url:`,tp.data.url());



  //tp.cm.setValue(tp.text.get());


  //  tp.text = new ReactiveVar()
  /*
  if (!host || !pathname) {
    console.log(`@72 missing-url -stop`)
    console.log(`host:${host}`)
    console.log(`pathname:${pathname}`)
    console.log(`xid:${xid}`)
    return;
  }*/



    Meteor.call('get-e3data',{host, pathname, xid, x:'hello'},(err,data)=>{
      ;(verbose >0) && console.log(`@81 Meteor.call('get-e3data')`)
      /*
          Keep it here, to avoid having a Tracker.autorun !
      */
      if (err) {
        console.log('get-e3data fails:',{err})
        console.log({data})
        return;
        throw err; // display error.
      }
      console.log(`@92: [${new Date().getTime()-etime}] Meteor.call => get-e3data:`,{data}) // here is the raw-file content
      const {data:article, error} = data;
      if (error) {
        state.set({error:'article-not-found', text:error})
        console.log(`@101: FATAL error:`, state.get())
        return;
      }

      // install_codeMirror(tp);



      /************************************************************************
      What to expect here:

          something for codeMirror: YAMl/metadata [+ MD-code]

      for museum: only metadata.

      When editora read from database, we expect pure text from safeLoad()

      *************************************************************************/



      if (false) {
        data.data = validate_and_enforce_xid(data.data, xid)
        console.log(`@95: `,data.data)
        assert(data.md_path)
      }

      md_fn = data.md_path;

  //    tp.text.set(data.text)
      Session.set('edit-host',host)
      Session.set('edit-pathname',pathname)
      Session.set('edit-xid',xid)
      assert(cm)
      cm.setValue(data.data);
return;
      cm.setValue(`---
sku: ${ai}
format: raw-html
---
${html}
      `);
    })

    /*
    Meteor.call('get-e3data',{fn:'web_page2',ai:'22222',x:'hello22222'},(err,data)=>{
      if (err) throw err; // display error.
      console.log(`[${new Date().getTime()-etime}] Meteor.call => get-e3data:`,{data}) // here is the raw-file content
    })*/

    assert(cm)

  cm.on("change", (cm, change)=>{ // transform MD -> Article -> html (preview)
    console.log(`codeMirror change:`,{change});
    /*
    var Article = Meteor.publibase_article;
    const self = this;
//    this.ccount.set(this.ccount.get()+1);
    Session.set('cm-hitCount',1);
    // update a reactive variable.
    let s = cm.getValue();

    // here we should extract data to go in headline, or abstract
    Editora.md_code.set(s);
//    const p = Meteor.publibase_dataset.cc.markup_render_preview(s);
//    Meteor.publibase.article_html_preview.set(p);
  */
    return false; // ??
  });

  // ---------------------------------------------------------------------------


  // ---------------------------------------------------------------------------

  function install_codeMirror(tp) {
    const cm_TextArea = tp.find('#cm_TextArea'); //document.getElementById('myText');

    console.log({cm_TextArea})
    console.log(`Template.edit_article.onRendered.data:`,tp.data)
    // configure codeMirror for this app-key
    const cm = CodeMirror.fromTextArea(cm_TextArea, {
  //      mode: "javascript",
  //      mode: "markdown",
        mode: "text/x-yaml",
        lineNumbers: true,
        viewportMargin:10,
        cursorScrollMargin: 5,
        lineWrapping: true,
        matchBrackets: true,
  //      keyMap:'vim',
        keyMap:'sublime',
        viewportMargin:100, // ???
//        viewportMargin: Infinity, // ???
        extraKeys: {
//          "Ctrl-S": commit_article.bind(tp),

          "Ctrl-S": function(instance) {
            console.log('SAVE',{instance});
            publish_article(tp); // should be commit without publish.
          }
  //        "Ctrl-Right": next_article,
  //        "Ctrl-Left": prev_article
        }
    });
    //  cm.save()
    $(".CodeMirror").css('font-size',"10pt");
    $(".CodeMirror").css('line-height',"24px");
    //cm.setSize('100%', '100%');
    cm.on('keydown',(instance,e)=>{
      Session.set('edit-status','editing')
      //console.log(`@324`,{e})
      tp.set_status_light ('status-orange')
      Session.set('edit-message','')

    })
    // json to yaml.
    return cm;
  } // install_codeMirror

}) // on Rendered

// ---------------------------------------------------------------------------

TP.events({
  /*
  'click .js-directory': (e,tp)=>{
    e.preventDefault(); // to avoid tailing #
//    publish_article(tp); // save, mk-html, mk-ts-vector
    const s3fpath = Session.get('edit-s3fpath')
    assert(s3fpath.endsWith('/index.md'))
    const s3dir = new s3parser(s3fpath).parent().parent().value;
    if (!s3dir) {
      tp.set_status_light ('status-orange')
      Session.set('edit-message',`invalid subsite <${subsite}>`)
      return;
    }
    FlowRouter.go('subsite-directory',{s3dir})
  }*/
})

// ---------------------------------------------------------------------------

TP.helpers({
  q: ()=>{
    return state.get()
  },
  error_code: (code)=>{
    return (state.get().error == code)
  },
  text: ()=>{
    return Template.instance().text.get();
  },
  fileName_or_url() {
    let s3fn = Session.get('edit-s3fpath')
    if (s3fn && s3fn.endsWith('.md')) {
      const {Bucket, subsite, xid} = utils.extract_xid2(s3fn)
      s3fn = `https://${Bucket}.com/${subsite}/${xid}`; // ~~~~~~~ to be fixed.
    }
    return s3fn;
  }
})



Template.edit_article_not_found.helpers({

})

Template.edit_article_not_found.events({
  'click .js-create-article': (e,tp)=>{
    console.log('create...')
    const {host, pathname, xid} = article_meta.get();

    Meteor.call('save-e3data',
      {host, pathname, xid, update:true, data:' ', md_path:'*void*.md'},
      (err,data)=>{
        if (err) throw err;
        console.log(`@224: retv:`,{data}) // here is the raw-file content
//        const tab = window.open('http://localhost:8080/en/new-products/1466','http://localhost:8080/en/new-products/1466')
      })
    return false;
  }
})




FlowRouter.route('/edit', { name: 'edit-article',
  triggerEnter: [
    function(context, redirect) {
      const web_page = Session.get('web-page');
      console.log(`triggerEnter web_page:`,Session.get('web-page'))
//      if (!web_page) redirect('/')
    }
  ],
  action: function(params, queryParams){
    console.log('Router::action for: ', FlowRouter.getRouteName());
    console.log(' --- params:',params);
    document.title = "editora-v2";
    console.log(`@210: host:`,location.host)
    const {host} = location;
//    const web_page = Session.get('web-page');
    /*
    if (!web_page) {
      console.log(`no web-page defined. switching to root.`)
      FlowRouter.go('/')
      return;
    } */
//    Session.set('article-id',params.article_id)
//    console.log(`html-page already set:`,Session.get('web-page'))
    console.log(`render data:`,Object.assign(params,queryParams))
//    BlazeLayout.render('edit_article',Object.assign(params,queryParams,{xid:queryParams.xid}));

    const {s3} = queryParams; // full Key for md-file
    if (!s3) throw 'INVALID PARAM'
    //console.log(`@225: `,{host},{s3})
    let {s3:s3fn, flags} = capture_options(s3);
    console.log(`@553 `,{flags},{s3fn})
    const {Bucket,subsite,xid,fn} = utils.extract_xid2('s3://'+s3fn)

    const s3_url = 's3://' + path.join(Bucket,subsite, xid || '' , fn||'index.md')

    /*
    const fn_ = (fn)? s3fn : path.join(s3fn, 'index.md')
    const s3dir = new utils.s3parser(s3fn).remove('index.md');
    const s3fpath = new utils.s3parser(s3fn).remove('index.md').add('index.md')
    assert(s3, 'missing s3path');
    */

//    Session.set('s3dir',s3dir) // this is the requested file

    Session.set('s3-url', s3_url) // this is the requested object-file
    BlazeLayout.render('edit_article', {s3_url, flags});
  }
});


function capture_options(url) {
  url = url.trim();
  const rx = /^(.*?)\s+\-\-(.*)$/;
  const v = rx.exec(url);
  const flags = v && (v.length>1) && v[2];
  const s3 = (v && v[1]) || url;
  return {s3, flags};
}


function validate_and_enforce_xid(data, xid) {
  const v = data.trim().split(/\-\-\-/g); //match(yamlBlockPattern);
  assert(!v[0])
  assert(v.length == 3)
//  v[1] = v[1].replace(/^([^:]+):\s*/gm,'$1<<>>').replace(/:/g,'~!~').replace(/<<>>/g,': ')

  //console.log(v[1]);
  let meta = yaml.safeLoad(v[1], 'utf8');
  if (!meta.xid) {
    meta = Object.assign({xid},meta)
//    meta.xid = xid;
    v[1] = yaml.safeDump(meta);
  }
  data = `---` + v[1] + '---' + v[2];
  return data;
}


// ------------------------------------------------------------------------


function get_s3Object(tp) {
  const etime_ = new Date().getTime();
  assert(tp)

  /*
    tp is used to update UI : reactive var mostly error and status.
  */


  Meteor.call('get-s3object', tp.s3fpath, (err, data)=>{
    console.log(`@54 get-e3data got-results [${new Date().getTime() - etime_} ms]`)
    /*
        Keep it here, to avoid having a Tracker.autorun !
    */
    if (err) {
      ;(verbose >0) && console.log(`@81 Meteor.call('get-e3data')`)
      console.log('get-e3data fails:',{err})
      console.log({data})
      Session.set('edit-status','error')
      tp.set_status_light('status-red')
      Session.set('edit-message','failed')
      return;
    }

    console.log(`@112 `,{data})
    if (data.error) {
      console.log(`@206 `, data.error)
      tp.set_status_light('status-red')
      if (flags == 'force') {
        Session.set('edit-message','force creating file please wait...')
        Meteor.call('new-article', tp.s3fpath, (err,data)=>{
          if (err) {
            tp.set_status_light('status-red')
            Session.set('edit-message','new-article system-error1')
            return;
          }
          if (data.error) {
            tp.set_status_light('status-red')
            Session.set('edit-message','new-article system-error2')
            return;
          }


          const {meta, md, error} = utils.extract_metadata(data.data)
          const cmValue = (meta)?`---\n${yaml.dump(meta)}---${md}`:md;
          tp.cm.setValue(cmValue);
          tp.meta = meta;
          document.title = `edit ${tp.s3fpath}`;
          Session.set('edit-s3fpath',`${tp.s3fpath}`)
          tp.set_status_light('status-ok')
          Session.set('edit-message','ready')

        })
        return;
      }
      Session.set('edit-message','file-not-found')
      return;
    }


    const {meta, md, error} = utils.extract_metadata(data.data)

    if (error) {
      console.log(`@117 `,{error})
      Session.set('edit-s3fpath',`${tp.s3fpath}`)
      Session.set('edit-message',error)
      Session.set('edit-status',error)
      tp.set_status_light('status-red')
      return;
    }

    if (!meta || !md) {
      console.log(`@117 `,{error})
      Session.set('edit-s3fpath',`${tp.s3fpath}`)
      Session.set('edit-status', 'no-data')
      return;
    }


    console.log(`@62 `,{meta},{md})
    const cmValue = (meta)?`---\n${yaml.dump(meta)}---${md}`:md;
    assert(tp.cm,'Missing tp.cm')
    tp.cm.setValue(cmValue);
    tp.meta = meta;
    document.title = `edit ${tp.s3fpath}`;
    Session.set('edit-s3fpath',`${tp.s3fpath}`)

    const {subsite, xid} = utils.extract_xid2(tp.s3fpath);
    Session.set('subsite',subsite)
    tp.set_status_light('status-ok')
    Session.set('edit-message','ready')
    document.title = xid;
  })

}
