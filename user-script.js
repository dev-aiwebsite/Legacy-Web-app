
        $ = jQuery.noConflict();
        let app_api = 'https://script.google.com/macros/s/AKfycbyiOmW7g_pSr_1kCL-zUypsYoub_jrSh9k9cPq12do-X2W0INNGLYtGnshyYqF-TSdY3A/exec'
        let DB
        $(document).ready(function () {

            fetch(app_api + '?action=readall', {method: 'GET'})
            .then(r => r.json())
            .then(res => {
                console.log(res)
                DB = res
                
                let team_id = localStorage['lwa_team_id']
                let team_data = DB.TEAMS.find(i => i.ID == team_id)

                $('.participant').removeClass('_loading')
                console.log(team_data)
                
                if(team_data){
                    $('#price_section').removeClass('hidden')
                } else {
                    $('#registration_section').removeClass('hidden')
                    localStorage['lwa_team_id'] = ""                    
                }

                $('#register-form label').addClass('*:bg-transparent *:border-none *:outline-none bg-stone-100 flex m-1 ring-1 ring-stone-200 rounded-lg')
                $('#register-form input').addClass('p-3')

                $(document).on('click', '[data-trigger]', function(e){
                    e.preventDefault()
                    let value = $(this).attr('data-trigger')
                    let $content_container = $(`[data-content="${value}"]`)
                    $('[data-trigger]').removeClass('active')
                    $(this).addClass('active')
                    $('[data-content]').addClass('hidden')
                    $content_container.removeClass('hidden')                
                })

                updatePriceList(DB)
                syncApp(5000)
                checkStage(res)
                
            })

            let $register_form = $('#register-form')
            $register_form.on('submit', function(e){
                e.preventDefault()

                let $submit_btn = $(this).find('button[type="submit"]')
                $submit_btn.addClass('_loading')
                let company = $(this).find('[name="company_name"]').val()
                let participants = []
                $(this).find('[name="team_member"]').each(function(){
                    participants.push($(this).val())
                })

                console.log('registration triggered')
                let data = {
                    'COMPANY': company,
                    'PARTICIPANTS': participants}

                let query = new URL(app_api)
                query.searchParams.append('action', 'insert')
                query.searchParams.append('data', JSON.stringify(data))

                fetch(query, {method: 'GET'})
                .then(r => r.json())
                .then(res => {
                    if(res.success){
                        alert('Registration successfull')
                        $('#registration_section').addClass('hidden')
                        $('#price_section').removeClass('hidden')
                        localStorage['lwa_team_id'] = res.TEAMS.ID

                    } else {
                        alert('something went wrong')
                    }
                    $submit_btn.removeClass('_loading')
                })
                .catch(err => {
                    alert(err)
                })

            })

            let $submit_price_form = $('#price-form')
            $submit_price_form.on('submit', function (e) {
                e.preventDefault()
                let $this = $(this)

                let $submit_btn = $this.find('button[type="submit"]')
                $submit_btn.addClass('_loading')
                let team_id = localStorage['lwa_team_id']
                let price = [$this.find('[name="price"]:checked').val()]

                let data = {
                    'PRICE': price
                }

                let query = new URL(app_api)
                query.searchParams.append('action', 'update')
                query.searchParams.append('id', team_id)
                query.searchParams.append('data', JSON.stringify(data))

                fetch(query, { method: 'GET' })
                    .then(r => r.json())
                    .then(res => {
                        console.log(res)
                        DB.TEAMS = res.db
                        if (res.success) {
                            updatePriceList(DB)
                            alert('update successfull')
                            $this[0].reset()
                        } else {
                            alert('something went wrong')
                        }
                        $submit_btn.removeClass('_loading')
                    })
                    .catch(err => {
                        alert(err)
                    })

            })

        })

        function syncApp(delay = 1000){

            function fetchData(){
                fetch(app_api + '?action=readall', {method: 'GET'})
                .then(r => r.json())
                .then(res => {
                    
                    DB = res
                    checkStage(res)
                    updatePriceList(DB)
                })
            }

            setInterval(fetchData, delay);
        }


        function updatePriceList(db){
            let team_id = localStorage['lwa_team_id']
            let team_data = db.TEAMS.find(i => i.ID == team_id)
            if(!team_data) return
            let team_price = jsonParse(team_data.PRICE)
            let pair_id = team_data.PAIR
            let vs_team_data = db.TEAMS.find(i => i.PAIR == pair_id && i.ID != team_id )

            let $price_table = $('table.price')
            let vs_team_price = jsonParse(vs_team_data?.PRICE)
            let team_profit = []
            let vs_team_profit = []
            $price_table.find('tbody').html("")
            $price_table.find('tfoot').html("")

            if (Array.isArray(team_price)){
                team_price.forEach((price,indx) => {
                    let profit_template = `<td></td><td></td>`
                    let highlight_1, highlight_2
                    let vs_teamprice = ""
                    
                    if(vs_team_price[indx]) {
                        vs_teamprice = vs_team_price[indx]
                        console.log('x team has price')
                        let profit = calculateProfit(price,vs_team_price[indx])
                        if(profit[0] > profit[1]){
                            highlight_1 = `bg-appred-400 text-white`
                        } else if(profit[1] > profit[0]){
                            highlight_2 = `bg-appred-400 text-white`
                        }

                        profit_template = `
                            <td class="${highlight_1}"><span class="currency">${profit[0]}K</span></td>
                            <td class="${highlight_2}"><span class="currency">${profit[1]}K</span></td>`

                            team_profit.push(profit[0])
                            vs_team_profit.push(profit[1])

                    }

                    let price_template = `<tr class="">
                        <td class="text-xs">Month ${indx + 1}</td>
                        <td><span class="currency">${price}</span></td>
                        <td><span class="currency">${vs_teamprice}</span></td>
                        <td class="!border-none"></td>
                        ${profit_template}
                    </tr>`
                    $price_table.find('tbody').append(price_template)

                    if(indx == team_price.length - 1) {
                        let team_total = team_profit.reduce((a, b) => a + b, 0)
                        let vs_team_total = vs_team_profit.reduce((a, b) => a + b, 0)
                        let yellow_bg1,yellow_bg2
                        if(team_total != vs_team_total){
                            if(team_total > vs_team_total){
                                yellow_bg1 = 'bg-yellow-300 text-black'
                            } else {
                                yellow_bg2 = 'bg-yellow-300 text-black'
                            }
                        }

                        let total_template = `
                        <tr class="*:border *:border-gray-300 sm*:px-5 *:border-solid sm*:py-1 *:p-2">
                            <td colspan="3" class="font-medium text-base text-center">TOTAL</td>
                            <td class="!border-none"></td>
                            <td class="${yellow_bg1}"><span class="currency">${team_total}</span></td>
                            <td class="${yellow_bg2}"><span class="currency">${vs_team_total}</span></td>
                        </tr>`
                    $price_table.find('tfoot').append(total_template)

                    }


                })
            }
            
        }

        function checkStage(db){
            let data = db.STAGES
            let team_id = localStorage['lwa_team_id']
            let price = jsonParse(db.TEAMS.find(i => i.ID == team_id)?.PRICE)
            
            if(!price || price.length < 4){
                localStorage['lwp_current_stage'] = 1
            }
            
            let current_stage = localStorage['lwp_current_stage']

            if(current_stage){
                if(current_stage == 1){
                    if(price.length >= 3){
                        localStorage['lwp_current_stage'] = 2
                        current_stage = localStorage['lwp_current_stage']
                    }
                    
                } else if(current_stage == 2){
                    if(price.length >= 7){
                        localStorage['lwp_current_stage'] = 3
                      current_stage = localStorage['lwp_current_stage']
                    }
                } 

                let current_stage_data = data.find(i => i.STAGE == current_stage)
                let isStarted = current_stage_data.START ? true : false
                if(isStarted){
                    $('#price_section')?.removeClass('_loading')
                } else {
                    $('#price_section')?.addClass('_loading')
                }

           } else {
                let current_stage_data = data.find(i => i.STAGE == 1)
                    let isStarted = current_stage_data.START ? true : false
                    if(isStarted){
                        $('#price_section')?.removeClass('_loading')
                        localStorage['lwp_current_stage'] = 1
                    } else {
                        $('#price_section')?.addClass('_loading')
                    }
           }
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


        function jsonParse(json){
            if(typeof(json) == 'object') return json
            try {
                return JSON.parse(json)

            } catch (error) {
                return false
            }

        }
