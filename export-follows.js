javascript:(()=>{
function copyToClipboard(a){
  let b=document.createElement("textarea")
  let c=document.getSelection()
  b.textContent=a
  document.body.appendChild(b)
  c.removeAllRanges()
  b.select()
  document.execCommand("copy")
  c.removeAllRanges()
  document.body.removeChild(b)
  console.log(`Copied cover art '${a}'`)
}
function createCopyButton() {
  let b = document.createElement('button')
  let d = document.createElement('div')
  let s = document.createElement('div')
  let f = document.createElement('div')
  s.appendChild(f)
  d.style.display="flex"
  d.style.alignItems='center'
  d.style.justifyContent='center'
  d.style.position="fixed"
  d.style.width="100vw"
  d.style.height="100vh"
  d.style.top="0"
  d.style.left="0"
  d.style.backgroundColor="rgba(0,0,0,.75)"
  d.style.flexWrap="wrap"
  d.style.flexDirection="column"
  d.appendChild(b)
  d.appendChild(s)
  b.textContent="Looking For Follows"
  b.disabled=true

  document.body.appendChild(d)
  return [b,f]
}
function fetchPage(page,button,container, pages) {
  console.log(`Fetching Page ${page}`)
  button.textContent=`Fetching Page ${page}${pages ? ` of ${pages}` : ''}`
  return new Promise((res,err) => {
    fetch(`https://mangadex.org/follows/manga/0/0/${page}/`).then((d)=>{

      d.text().then((html)=>{
        let doctype = document.implementation.createDocumentType( 'html', '', '');
        let dom = document.implementation.createDocument('', 'html', doctype);
        dom.documentElement.innerHTML = html

        let manga = Object.values(dom.documentElement.querySelectorAll(".manga-entry"))
        if (manga.length == 0 ) {
          return err()
        }
        manga=serializeTitles(manga)
        container.textContent = container.textContent ? container.textContent : 0
        let [,found,total] = dom.documentElement.querySelector('#chapters > p').textContent.match(/to (\d+) of (\d+)/)
        let pages = dom.documentElement.querySelector('#chapters .page-link .fa-angle-double-right').parentElement.href.match(/(\d+)\/$/)[1]
        container.textContent = `Found ${found} / ${total} follows.`
        if ( page >= parseInt(pages) ) {
          return res(manga)
        }
        res(fetchPage(page+1,button,container,pages).then((e)=>{ return manga.concat(e) }).catch((e)=>{return manga }))
      }).catch(err)
    }).catch(err)
  })
}
function serializeTitles(mangaList) {
  return mangaList.map((me)=>{
    let data = {}
    data.id = me.dataset.id
    data.title = me.querySelector('.manga_title').title
    data.url = me.querySelector('.manga_title').href
    me.querySelectorAll('.btn-group .dropdown-menu .dropdown-item.disabled').forEach((opt)=>{
      if (opt.classList.contains('manga_rating_button')) {
        let rating = opt.textContent.trim()
        if (rating != "") {
          data.rating = opt.id
        }
      }
      else if (opt.classList.contains('manga_follow_button')) {
        data.followText = opt.textContent.trim()
        data.follow = opt.id
      }
    })
    return data
  })
}

let [button,container] = createCopyButton()
fetchPage(1,button,container).then((data)=>{
  let titles = data.sort((a,b)=> a.follow - b.follow || (b.rating != null ? b.rating : -1 ) - (a.rating != null ? a.rating : -1 ) ).reduce((k,e)=>`${k == "" ? "" : k + "\n" }${e.followText}${e.rating != null ? ` (${e.rating})` : "" }: ${e.title}`,"")
  console.log(titles)
  button.textContent = "Copy Follows!"
  button.disabled=false
  button.onclick=()=>{
    copyToClipboard(titles)
    button.parentElement.remove()
  }
})
})()
