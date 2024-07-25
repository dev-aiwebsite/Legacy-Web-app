$ = jQuery.noConflict();
let app_api = 'https://script.google.com/macros/s/AKfycbwZ82GZp4OtA8NiJwrLtNTCEE8Kb59GVeswsKGBuDT_MUF1A4UVMCQoRGsWf51zfEj-dQ/exec'
let team_price_profit = []
let DB
let syncAppInterval
const APP_COLORS_ARRAY = ["#771a30","#0a0c52","#b2265c","#77378d","#0c3a83","#479eaa","#5c92b1"]

$(document).ready(function () {
    let $content_wrapper = $('#content-wrapper');

    $(document).on('click', '[data-trigger]', function(e){
        e.preventDefault()
        let value = $(this).attr('data-trigger')
        let $content_container = $(`[data-content="${value}"]`)
        $('[data-trigger]').removeClass('active')
        $(this).addClass('active')
        $('[data-content]').addClass('hidden')
        $content_container.removeClass('hidden')                
    })

    $content_wrapper.addClass('_loading')
    fetch(app_api + '?action=readall', {method: 'GET'})
    .then(r => r.json())
    .then(res => {
        DB = res
        $content_wrapper.removeClass('_loading')
        console.log(res)
        renderGroup(DB)
        renderPair(DB)
        updateTeamData(DB)
        renderLeaderboardPerTeam(DB)
        syncApp(3000)

        let stage_to_start = res.STAGES.find(i => i.START != 'TRUE')?.STAGE || null
        renderStartButton(stage_to_start)
    
      
   
    }) // end fetch
    
    

    let $match_pair_button = $('[data-action="match_pair"]')
    $match_pair_button.on('click', function(e){
        e.preventDefault()
        $this = $(this)
        $this.addClass('_loading')
        fetch(app_api + '?action=matchpair', {method: 'GET'})
        .then(r => r.json())
        .then(res => {
            console.log(res)
            $this.removeClass('_loading')
            DB.TEAMS = res.db
            renderGroup(DB)
            renderPair(DB)
            updateTeamData(DB)
        })

    })

    initDraggable()
})

$(document).on('click', `[data-pair]`, function(){
    let pair_id = $(this).attr('data-pair')
    renderPairData(DB,pair_id)

    $dialog_pair_details = $('#pair_details')
    $dialog_pair_details[0].showModal()
    $('.dragging')?.removeAttr('style')
})

$(document).on('click', '[data-dialog-action="close"]', function(e){
    e.preventDefault()
    $(this).closest('dialog')[0]?.close()
})

$(document).on('input', `input[name="group_pair"]`, function(e){
    e.preventDefault()
    let to_search = $(this).val()

    $('[data-content="leaderboard"] [data-pair]').each(function(){
        let contents = $(this).text().toLowerCase()
        $(this).toggle(contents.includes(to_search.toLowerCase()))
    })
    
})

function renderPairData(db,pair_id){   
    let $price_table = $('table.price')
    let $dialog = $price_table.closest('dialog')

    $price_table.find('tbody').html("")
    $price_table.find('tfoot').html("")
    $dialog.find('.team_1_name').html("")
    $dialog.find('.team_2_name').html("")

    let data = db.TEAMS.filter(i => i.PAIR == pair_id)
    let team_1 = data[0]
    let team_2 = data[1]            

    let team_1_price_array = jsonParse(team_1.PRICE)
    let team_2_price_array = jsonParse(team_2.PRICE)

    let team_1_profit_array = []
    let team_2_profit_array = []
    
    // update teams name
    $dialog.find('.team_1_name').text(team_1.COMPANY)
    $dialog.find('.team_2_name').text(team_2.COMPANY)

    if (Array.isArray(team_1_price_array)){
        team_1_price_array.forEach((team_1_price,indx) => {
            if(indx >= 8) return
            let profit_template = `<td></td><td></td>`
            let highlight_1, highlight_2
            let team_2_price = team_2_price_array[indx] || ""
            
            if(team_2_price) {
                let profit = calculateProfit(team_1_price,team_2_price)

                if(profit[0] > profit[1]){
                    highlight_1 = `bg-appred-400 text-white`
                } else if(profit[1] > profit[0]){
                    highlight_2 = `bg-appred-400 text-white`
                }

                profit_template = `
                    <td class="${highlight_1}"><span class="currency">${profit[0]}K</span></td>
                    <td class="${highlight_2}"><span class="currency">${profit[1]}K</span></td>`

                    team_1_profit_array.push(profit[0])
                    team_2_profit_array.push(profit[1])

            }

            let price_template = `<tr class="">
                <td class="text-xs">Month ${indx + 1}</td>
                <td><span class="currency">${team_1_price}</span></td>
                <td><span class="currency">${team_2_price}</span></td>
                <td class="!border-none"></td>
                ${profit_template}
            </tr>`

            if(indx == 3 || indx == 7){
                let text = 'First Negotiation'
                if(indx == 7){
                    text = 'Second Negotiation'
                }
                let negoRowTemplate = `<tr class="" style=""><td colspan="100%" style="
                        border: none;
                        padding: 10px 0 0 0;
                    "><div style="
                        display: flex;
                        align-items: center;
                        align-content: center;
                        justify-content: center;
                        background: #5c92b1;
                        color: #fff;
                        gap: 10px;
                        padding: 10px;
                    "><svg width="32" height="18" viewBox="0 0 32 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M16.17 0.993845L11.33 4.6692C10.525 5.27863 10.37 6.37561 10.98 7.1585C11.625 7.99296 12.88 8.15703 13.745 7.52416L18.71 3.90506C19.06 3.65191 19.56 3.70817 19.835 4.03633C20.11 4.36448 20.045 4.83328 19.695 5.09111L18.65 5.85056L25.6 11.8511V3.00029H25.565L25.37 2.88309L21.74 0.703193C20.975 0.243773 20.08 0 19.17 0C18.08 0 17.02 0.351596 16.17 0.993845ZM17.31 6.82566L14.725 8.71021C13.15 9.86345 10.865 9.56342 9.685 8.04452C8.575 6.6147 8.855 4.61763 10.32 3.50659L14.48 0.351596C13.9 0.121887 13.275 0.00468788 12.64 0.00468788C11.7 -7.16023e-08 10.785 0.262525 10 0.750072L6.4 3.00029V13.5013H7.81L12.38 17.411C13.36 18.2502 14.875 18.1846 15.77 17.2657C16.045 16.9798 16.23 16.6469 16.325 16.3L17.175 17.0313C18.15 17.8705 19.67 17.8095 20.565 16.8954C20.79 16.6657 20.955 16.3985 21.06 16.1219C22.03 16.7313 23.35 16.6047 24.165 15.7703C25.06 14.8561 24.995 13.431 24.02 12.5918L17.31 6.82566ZM0.8 3.00029C0.36 3.00029 0 3.33782 0 3.75036V13.5013C0 14.3311 0.715 15.0014 1.6 15.0014H3.2C4.085 15.0014 4.8 14.3311 4.8 13.5013V3.00029H0.8ZM2.4 12.0012C2.61217 12.0012 2.81566 12.0802 2.96569 12.2208C3.11571 12.3615 3.2 12.5523 3.2 12.7512C3.2 12.9502 3.11571 13.1409 2.96569 13.2816C2.81566 13.4223 2.61217 13.5013 2.4 13.5013C2.18783 13.5013 1.98434 13.4223 1.83431 13.2816C1.68429 13.1409 1.6 12.9502 1.6 12.7512C1.6 12.5523 1.68429 12.3615 1.83431 12.2208C1.98434 12.0802 2.18783 12.0012 2.4 12.0012ZM27.2 3.00029V13.5013C27.2 14.3311 27.915 15.0014 28.8 15.0014H30.4C31.285 15.0014 32 14.3311 32 13.5013V3.75036C32 3.33782 31.64 3.00029 31.2 3.00029H27.2ZM28.8 12.7512C28.8 12.5523 28.8843 12.3615 29.0343 12.2208C29.1843 12.0802 29.3878 12.0012 29.6 12.0012C29.8122 12.0012 30.0157 12.0802 30.1657 12.2208C30.3157 12.3615 30.4 12.5523 30.4 12.7512C30.4 12.9502 30.3157 13.1409 30.1657 13.2816C30.0157 13.4223 29.8122 13.5013 29.6 13.5013C29.3878 13.5013 29.1843 13.4223 29.0343 13.2816C28.8843 13.1409 28.8 12.9502 28.8 12.7512Z" fill="white"></path>
                    </svg>

                    <span style="display: inline-block;">${text}
                    </span></div></td>       
                </tr>`
                $price_table.find('tbody').append(negoRowTemplate)
            }
            $price_table.find('tbody').append(price_template)

            // append total
                let team_1_total = team_1_profit_array.slice(0,8).reduce((a, b) => a + b, 0)
                let team_2_total = team_2_profit_array.slice(0,8).reduce((a, b) => a + b, 0)
                let yellow_bg1,yellow_bg2
                if(team_1_total != team_2_total){
                    if(team_1_total > team_2_total){
                        yellow_bg1 = 'bg-yellow-300 text-black'
                    } else {
                        yellow_bg2 = 'bg-yellow-300 text-black'
                    }
                }

                
        

                let total_template = `
                <tr class="*:border *:border-gray-300 sm*:px-5 *:border-solid sm*:py-1 *:p-2">
                    <td colspan="3" class="font-medium text-base text-center">TOTAL</td>
                    <td class="!border-none"></td>
                    <td class="${yellow_bg1}"><span class="currency">${formatCurrency(team_1_total)}</span></td>
                    <td class="${yellow_bg2}"><span class="currency">${formatCurrency(team_2_total)}</span></td>
                </tr>`
            $price_table.find('tfoot').html(total_template)

        })
    }
    
}

function updateTeamData(db){
    console.log('update team data')
    team_price_profit = []
    
    let pair_ids = []
    db.TEAMS.forEach(i => {
        if(i.PAIR != "" && !pair_ids.includes(i.ID)){
            pair_ids.push(i.PAIR)
        }
    })

    pair_ids.forEach(pair_id => {

        let pair_data = {
            'pair_id': pair_id,
            teams: [
                {
                    team_id: "",
                    team_price: [],
                    team_profit: [],
                    team_total: "",// total profit
                },
                {
                    team_id: "",
                    team_price: [],
                    team_profit: [],
                    team_total: "",// total profit
                },

            ],
            winner: "", //team_id
        }

        let teams_data = db.TEAMS.filter(i => i.PAIR == pair_id)
        let team_1 = teams_data[0]
        let team_2 = teams_data[1]            

        let team_1_price_array = jsonParse(team_1.PRICE) || ""
        let team_2_price_array = jsonParse(team_2.PRICE) || ""

        let team_1_profit_array = []
        let team_2_profit_array = []

        if (Array.isArray(team_1_price_array)){
            pair_data.teams[0]['team_id'] = team_1.ID
            pair_data.teams[0]['team_price'] = team_1_price_array

            pair_data.teams[1]['team_id'] = team_2.ID
            pair_data.teams[1]['team_price'] = team_2_price_array


            team_1_price_array.forEach((team_1_price,indx) => {
                let team_2_price = team_2_price_array[indx] || ""
                if(team_2_price) {
                    let profit = calculateProfit(team_1_price,team_2_price)
                    team_1_profit_array.push(profit[0])
                    team_2_profit_array.push(profit[1])
                }
            })



            
            let team_1_total = team_1_profit_array?.slice(0,8).reduce((a, b) => a + b, 0)
            let team_2_total = team_2_profit_array?.slice(0,8).reduce((a, b) => a + b, 0)

            pair_data.teams[0]['team_profit'] = team_1_profit_array
            pair_data.teams[0]['team_total'] = team_1_total

            pair_data.teams[1]['team_profit'] = team_2_profit_array
            pair_data.teams[1]['team_total'] = team_2_total

            
            $(`[data-pair="${pair_id}"] .winner`)?.removeClass('winner')
            if(team_1_total != team_2_total){
                if(team_1_total > team_2_total){
                    pair_data['winner'] = team_1.ID
                    $(`[data-pair="${pair_id}"] [data-team-id="${team_1.ID}"]`)?.addClass('winner')
                } else {
                    pair_data['winner'] = team_2.ID
                    $(`[data-pair="${pair_id}"] [data-team-id="${team_2.ID}"]`)?.addClass('winner')
                }
            }
        }

        team_price_profit.push(pair_data)
    })          
}

function calculateProfit(a,b){
    let d = {
        '10': {
            '10': [50,50],
            '20': [150,30],
            '30': [150,20]
        },
        '20': {
            '10': [30,150],
            '20': [80,80],
            '30': [180,20]
        },
        '30': {
            '10': [20,150],
            '20': [20,180],
            '30': [110,110]
        },
    }
    return d[a][b]
}

function syncApp(delay = 1000){
    clearInterval(syncAppInterval)
    function fetchData(){
        let rand = Math.random()
        fetch(`${app_api}?action=readall&rand=${rand}`, {method: 'GET'})
        .then(r => r.json())
        .then(res => {
            let oldData = JSON.stringify(DB)
            let newData = JSON.stringify(res)
            if(oldData == newData) return
            DB = res

            let old_group = []
            let old_ids = DB.TEAMS.map(i => {

                if(!old_group.includes(i.PAIR )){
                    old_group.push(i.PAIR)
                }
                 return i.ID
            })

            let new_pair = []
            let new_group = []

            res.TEAMS.forEach(i => {
                if(!isInArray(old_ids,i.ID)) {
                    new_pair.push(i)
                }

                if(!isInArray(old_group,i.PAIR)) {
                    new_group.push(i)
                }
            })

    
            renderPair(DB)
            

            if(new_group.length){
                renderGroup(new_group)
            }

            updateTeamData(DB)
            renderLeaderboardPerTeam(DB)
            let stage_to_start = DB.STAGES.find(i => i.START != "TRUE")?.STAGE || null
            renderStartButton(stage_to_start)
        })
    }

    syncAppInterval = setInterval(fetchData, delay);
}

function isInArray(array,toCheck){
    let index = array.findIndex(i => i == toCheck)
    return index != -1 
}

function renderPair(db){     
    $('[data-content="pairs"] > div').html("");  
    if(!db.TEAMS.length) return
    db.TEAMS.forEach(group => {
        let participants = jsonParse(group.PARTICIPANTS)
        if(!participants) return

        
        let template = `<div data-pair class="*:flex *:h-10 isolate relative w-full" style="--color: ${group.COLOR}; color:var(--color)">
            <div class="bg-white capitalize font-medium items-center pl-1 relative sm:text-lg text-sm z-10">${group.COMPANY}</div>
            <div
                class="-translate-x-4 -translate-y-1/2 absolute border-dashed border-px border-stone-400 top-1/2 w-5">
            </div>
            <div class="bg-white flex-col pl-4 relative sm:text-sm text-xs z-10">
                <div class="bg-white pl-1 relative z-10">${participants[0]}</div>
                <div class="-translate-x-4 -translate-y-1/2 absolute border-dashed border-px border-stone-400 h-1/2 top-1/2 w-5">
                </div>
                <div class="bg-white pl-1 relative z-10">${participants[1]}</div>
            </div>
        </div>`

        $('[data-content="pairs"] > div').append(template);
    })  
}

function renderGroup(db){
    let groups_with_pair = db.TEAMS.filter(i => i.PAIR != "")

    if(!groups_with_pair.length) return
    $('button[data-action="match_pair"]').text('Match Again')
    $('.group-container').html("")
    
    groups_with_pair.forEach(group => {
        let $pair_container = $('.group-container').find(`[data-pair="${group.PAIR}"]`)
        
        if(!$pair_container.length){
            $pair_container = $(`<div data-pair="${group.PAIR}" class="h-fit cursor-pointer hover:ring-blue-200 hover:shadow-lg p-4 ring-1 ring-gray-200 rounded-xl shadow-md text-center">
                <div style="--color:${group.COLOR}" data-team-id="${group.ID}" class="[&.winner]:text-white bg-gray-100 capitalize font-medium p-2 ring-stone-100 rounded-lg text-sm">${group.COMPANY}</div><p class="font-medium my-1 text-stone-400 text-xs">Vs</p>
                </div>`)    
            $('.group-container').append($pair_container)
        } else {
            $pair_container.append(` <div style="--color:${group.COLOR}" data-team-id="${group.ID}" class="[&.winner]:text-white bg-gray-100 capitalize font-medium p-2 ring-stone-100 rounded-lg text-sm">${group.COMPANY}</div>`)
        }        
        
    })

    $('.group-container').removeClass('hidden');

}

function jsonParse(json){
    if(typeof(json) == 'object') return json
    try {
        return JSON.parse(json)

    } catch (error) {
        return false
    }

}

$(document).on('click', '[data-start-stage]', function(e){
    e.preventDefault()
    let stage = $(this).attr('data-start-stage')
    if(!stage) return
    $('[data-start-stage]').addClass('_loading')
    let data = JSON.stringify({'START': "TRUE"})

    fetch(app_api + `?action=update&table=STAGES&data=${data}&id=${stage}`, {method: 'GET'})
    .then(r => r.json())
    .then(res => {
        $('[data-start-stage]').removeClass('_loading')
        console.log(res)
        DB.STAGES = res.db
        if(res.success){
            console.log(DB)
            let stage_to_start = DB.STAGES.find(i => i.START != "TRUE")?.STAGE || null
            renderStartButton(stage_to_start)
         
        }
    })

})

function renderStartButton(stage_to_start){
    if(stage_to_start){
        $('[data-start-stage]')?.remove()
        let startButton = `<button class="cursor-pointer bg-appred-400/90 hover:bg-appred-400 border-none m-1 ml-auto px-4 ring-none rounded-xl text-base text-white uppercase" type="button" data-start-stage="${stage_to_start}">Start round ${stage_to_start}</button>`
        $('.toolbar').prepend(startButton)
    } else {
        $('[data-start-stage]')?.remove()
        let startButton = `<button data-start-stage class="pointer-events-none cursor-pointer bg-appred-400/90 hover:bg-appred-400 border-none m-1 ml-auto px-4 ring-none rounded-xl text-base text-white uppercase" type="button">No more rounds to start</button>`
        $('.toolbar').prepend(startButton)
    }
}


$(document).on('change', '[name="leaderboard_type"]', function(){
    let val = $(this).val()

    if(val == "all"){
        $('[data-content="leaderboard"] .group-container').removeClass('hidden')
        $('[data-content="leaderboard"] .team-container').addClass('hidden')
    } else {
        $('[data-content="leaderboard"] .group-container').addClass('hidden')
        $('[data-content="leaderboard"] .team-container').removeClass('hidden')
    }
})

function renderLeaderboardPerTeam(db){
    let $container = $('[data-content="leaderboard"] .team-container')
    let groups_with_pair = db.TEAMS.filter(i => i.PAIR != "")
    if(!groups_with_pair.length) return
    
    let rendered_pairs = []
    let items_to_render = []

    groups_with_pair.forEach(group => {
        let pair_number = group.PAIR
        if(rendered_pairs.includes(pair_number)) return
        let team_1_id = group.ID
        let vs_team = groups_with_pair.find(i => i.PAIR == pair_number && i.ID != team_1_id)
        let my_team_total = group?.PRICE ? JSON.parse(group.PRICE)?.slice(0,8) : []
        let vs_team_total = vs_team?.PRICE ? JSON.parse(vs_team.PRICE)?.slice(0,8) :  []

        let my_team_total_profit = []
        let vs_team_total_profit = []
        
        my_team_total.forEach((price,index)=> {
        
            if(!price || !vs_team_total[index]) return

            let profit = calculateProfit(price,vs_team_total[index])
            my_team_total_profit.push(profit[0])
            vs_team_total_profit.push(profit[1])
        })
        
    
        let item1 = {
            company: group.COMPANY,
            total: my_team_total_profit.reduce((a, b) => Number(a) + Number(b), 0),
            pair: pair_number,
            team_id: team_1_id
        }
        
        let item2 = {
            company: vs_team.COMPANY,
            total: vs_team_total_profit.reduce((a, b) => Number(a) + Number(b), 0),
            pair: pair_number,
            team_id: vs_team.ID
        }
        

        items_to_render.push(item1,item2)
        rendered_pairs.push(pair_number)

    })

    items_to_render.sort((a,b) => b.total - a.total)
    items_to_render = items_to_render.map((v,i)=>{
        let currentSearchQuery = $(`[type="search"][name="group_pair"]`).val()
        let style = ""

        if(currentSearchQuery != "" && !JSON.stringify(v).toLowerCase().includes(currentSearchQuery)){
            style = 'display:none'
        }

        let template = `
        <tr class="group" data-pair="${v.pair}" data-team-id="${v.team_id}" style="${style}">
        <td class="!border-none">${i + 1}</td>
            <td class="group-hover:bg-appred-300/10 min-w-[200px]">${v.company}</td>
            <td class="!border-none w-[10px]"></td>
            <td class="group-hover:bg-appred-300/10 min-w-[200px]"><span class="currency">${formatCurrency(v.total)}<span></td>
        </tr>
        `
        return template
    })

    $container.find('tbody').html(items_to_render.join(' '))
}


function initDraggable(){
    const draggableDiv = $('[draggableEL]')[0];

    let isDragging = false;
    let offsetX = 0;
    let offsetY = 0;

    draggableDiv.addEventListener('mousedown', (e) => {
        if(e.target.closest('[data-dialog-action="close"]')) return

        isDragging = true;
        let draggableEl = e.target.closest('[draggableEl]');

        offsetX = e.clientX - draggableEl.offsetLeft;
        offsetY = e.clientY - draggableEl.offsetTop;

        draggableEl.classList.remove('cursor-grab')
        draggableEl.classList.add('cursor-grabbing')
        draggableEl.classList.add('dragging')
    });

    document.addEventListener('mousemove', (e) => {
        const draggingEl = document.querySelector('.dragging');
    
        if (isDragging && draggingEl) {
            draggingEl.style.left = `${e.clientX - offsetX}px`;
            draggingEl.style.top = `${e.clientY - offsetY}px`;
        }
    });

    document.addEventListener('mouseup', (e) => {
        isDragging = false;
        $('.dragging').removeClass('cursor-grabbing')
        $('.dragging').addClass('cursor-grab')
        $('.dragging').removeClass('dragging')
    });
}

function formatCurrency(num) {
    let total = String(num)
    if(total.length < 4){
        total = `${total}K`
    } else if(total.length >= 4){
        total = `${total.slice(0,1)}.${total.slice(1)}M`
    } 

    return total
}

$(document).on('click', '[data-reset-app]', function(e){
    e.preventDefault()
    if(!confirm('Are you sure you want to reset the app?')) return
    $(this).addClass('_loading')
    fetch(app_api + '?action=reset', {method: 'GET'})
    .then(r => r.json())
    .then(res => {
        if(res.success){
            location.reload()
        } else {
            alert(res.message)
        }


    }).catch(err => {
        alert(err)
    })
})


function hexToHSL(hex) {
    // Convert hex to RGB
    let r = parseInt(hex.slice(1, 3), 16) / 255;
    let g = parseInt(hex.slice(3, 5), 16) / 255;
    let b = parseInt(hex.slice(5, 7), 16) / 255;

    // Find min and max values of RGB
    let max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
        h = s = 0; // achromatic
    } else {
        let d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }

        h /= 6;
    }

    h = Math.floor(h * 360);
    s = Math.floor(s * 100);
    l = Math.floor(l * 100);

    return `hsl(${h}, ${s}%, ${l}%)`;
}

// Convert APP_COLORS_ARRAY to HSL array
const APP_HSL_COLORS_ARRAY = APP_COLORS_ARRAY.map(hexToHSL);

// Function to get a random color from the HSL array
function getRandomHSLColorFromArray() {
    const randomIndex = Math.floor(Math.random() * APP_HSL_COLORS_ARRAY.length);
    return APP_HSL_COLORS_ARRAY[randomIndex];
}


function getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}
