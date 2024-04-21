$ = jQuery.noConflict();
let app_api = 'https://script.google.com/macros/s/AKfycbyiOmW7g_pSr_1kCL-zUypsYoub_jrSh9k9cPq12do-X2W0INNGLYtGnshyYqF-TSdY3A/exec'
let DB 
let team_price_profit = []


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
        syncApp(3000)
    }) // end fetch
    
    

    let $match_pair_button = $('[data-action="match_pair"]')
    $match_pair_button.on('click', function(e){
        e.preventDefault()
        $this = $(this)
        $this.addClass('_loading')
        fetch(app_api + '?action=matchpair', {method: 'GET'})
        .then(r => r.json())
        .then(res => {
            $this.removeClass('_loading')
            DB.TEAMS = res.db
            renderGroup(DB)
        })

    })
 
})

$(document).on('click', `[data-pair]`, function(){
    let pair_id = $(this).attr('data-pair')
    renderPairData(DB,pair_id)

    $dialog_pair_details = $('#pair_details')
    $dialog_pair_details[0].showModal()
})

$(document).on('click', '[data-dialog-action="close"]', function(e){
    e.preventDefault()
    $(this).closest('dialog')[0]?.close()
})

$(document).on('search', `input[name="group_pair"]`, function(e){
    e.preventDefault()
    let to_search = $(this).val()
    console.log('searching', to_search)
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
    $dialog.find('.team_1_name').html(team_1.COMPANY)
    $dialog.find('.team_2_name').html(team_2.COMPANY)

    if (Array.isArray(team_1_price_array)){
        team_1_price_array.forEach((team_1_price,indx) => {
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
            $price_table.find('tbody').append(price_template)

            if(indx == team_1_price.length - 1) {
                let team_1_total = team_1_profit_array.reduce((a, b) => a + b, 0)
                let team_2_total = team_2_profit_array.reduce((a, b) => a + b, 0)
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
                    <td class="${yellow_bg1}"><span class="currency">${team_1_total}</span></td>
                    <td class="${yellow_bg2}"><span class="currency">${team_2_total}</span></td>
                </tr>`
            $price_table.find('tfoot').append(total_template)

            }


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



            let team_1_total = team_1_profit_array.reduce((a, b) => a + b, 0)
            let team_2_total = team_2_profit_array.reduce((a, b) => a + b, 0)

            pair_data.teams[0]['team_profit'] = team_1_profit_array
            pair_data.teams[0]['team_total'] = team_1_total

            pair_data.teams[1]['team_profit'] = team_2_profit_array
            pair_data.teams[1]['team_total'] = team_2_total

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

    function fetchData(){
        fetch(app_api + '?action=readall', {method: 'GET'})
        .then(r => r.json())
        .then(res => {
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

            if(new_pair.length){
                renderPair(new_pair)
            }

            if(new_group.length){
                renderGroup(new_group)
            }

            DB = res
            updateTeamData(DB)
        })
    }

    setInterval(fetchData, delay);
}

function isInArray(array,toCheck){
    let index = array.findIndex(i => i == toCheck)
    return index != -1 
}

function renderPair(db){       
    db.TEAMS.forEach(group => {
        let participants = jsonParse(group.PARTICIPANTS)
        if(!participants) return

        let template = ` <div class="*:flex *:h-10 isolate relative w-full">
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

        $('[data-content="pairs"]').append(template);
    })  
}

function renderGroup(db){
    let groups_with_pair = db.TEAMS.filter(i => i.PAIR != "")
    if(!groups_with_pair.length) return
    $('.group-container').html("")
    groups_with_pair.forEach(group => {
        let $pair_container = $(`[data-pair="${group.PAIR}"]`)
        
    
        if($pair_container.length){
            let template = ` <div data-team-id="${group.ID}" class="[&.winner]:bg-appred-300 [&.winner]:text-white bg-gray-100 capitalize font-medium p-2 ring-stone-100 rounded-lg text-sm">${group.COMPANY}</div>`
            $pair_container.append(template);

        } else {
            let template = 
                `<div data-pair="${group.PAIR}" class="h-fit cursor-pointer hover:ring-blue-200 hover:shadow-lg p-4 ring-1 ring-gray-200 rounded-xl shadow-md text-center">
                <div data-team-id="${group.ID}" class="[&.winner]:bg-appred-300 [&.winner]:text-white bg-gray-100 capitalize font-medium p-2 ring-stone-100 rounded-lg text-sm">${group.COMPANY}</div>
                <p class="font-medium my-1 text-stone-400 text-xs">Vs</p>
               </div>`

            $('.group-container').append(template).removeClass('hidden');
            $('[data-action="match_pair"]').addClass('hidden')
        }                      
    })
}

function jsonParse(json){
    if(typeof(json) == 'object') return json
    try {
        return JSON.parse(json)

    } catch (error) {
        return false
    }

}
